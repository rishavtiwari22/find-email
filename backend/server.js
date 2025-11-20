import express from "express";
import cors from "cors";
import { getJson } from "serpapi";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import * as EmailValidator from "email-validator";

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.SERPAPI_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// SerpAPI endpoint
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;

    const data = await getJson({
      engine: "google",
      q,
      api_key: API_KEY,
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching data from SerpAPI" });
  }
});

// DuckDuckGo endpoint
app.get("/duckduckgo", async (req, res) => {
  try {
    const q = req.query.q;
    
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&skip_disambig=1`);
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching data from DuckDuckGo" });
  }
});

// Hunter.io domain search endpoint
app.get("/hunter-domain-search", async (req, res) => {
  try {
    const domain = req.query.domain;
    
    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    const apiUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}`;
    
    console.log('Making Hunter.io domain search request for:', domain);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.details || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    res.json(data);
  } catch (err) {
    console.error('Hunter.io domain search error:', err);
    res.status(500).json({ error: "Error fetching data from Hunter.io domain search API", details: err.message });
  }
});

// Hunter.io email finder endpoint
app.get("/hunter-email-finder", async (req, res) => {
  try {
    const { domain, first_name, last_name } = req.query;
    
    if (!domain || !first_name || !last_name) {
      return res.status(400).json({ error: "Domain, first_name, and last_name parameters are required" });
    }

    const apiUrl = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}&api_key=${HUNTER_API_KEY}`;
    
    console.log('Making Hunter.io email finder request for:', first_name, last_name, '@', domain);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.details || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    res.json(data);
  } catch (err) {
    console.error('Hunter.io email finder error:', err);
    res.status(500).json({ error: "Error fetching data from Hunter.io email finder API", details: err.message });
  }
});

// Gemini email generation endpoint
app.post("/generate-emails", async (req, res) => {
  try {
    const { prompt, contextData, targetUser } = req.body;
    
    console.log("Received request:");
    console.log("Prompt:", prompt);
    console.log("Context Data:", contextData);
    console.log("Target User:", targetUser);

    if (!contextData || contextData.trim() === '') {
      console.log("Context data is missing or empty");
      return res.status(400).json({ error: "Context data is required" });
    }

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return res.status(500).json({ error: "Gemini API key is not configured" });
    }

    console.log("Initializing Gemini model...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    // Create a comprehensive prompt for email address generation
    const emailCount = targetUser && targetUser.trim() ? 5 : 10;
    const fullPrompt = `
Context Data: ${contextData}

User Request: ${prompt || "Generate email addresses based on the provided context data"}

${targetUser ? `Target User: ${targetUser}` : ''}

Based on the above context data(You can search form web also), analyze the information and generate exactly ${emailCount} potential email addresses ${targetUser ? `specifically for the user "${targetUser}"` : 'for employees or contacts mentioned'}. Look for:
- Names of people mentioned in the context
- Company domain information
- Common email patterns used by the organization
- Job titles or roles mentioned

Format the response as a JSON array with this structure:

[
  {
    "name": "Full Name",
    "email": "email@company.com",
    "role": "Job Title/Role",
    "source": "Where this information was found",
    "confidence": "high/medium/low"
  }
]

Guidelines:
- Extract actual names mentioned in the context data
- Use the company domain found in the context (like @navgurukul.org)
- Follow common email patterns: firstname.lastname@domain, firstname@domain, f.lastname@domain 
- If no specific names are found, generate realistic names based on the context and search on web also.
- Include job roles/titles when available
- Mark confidence level based on how much information was available
- Ensure all email addresses follow proper format
- Generate exactly ${emailCount} email entries

Return only the JSON array, no additional text.
    `;

    console.log("Generating content with Gemini...");
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("Gemini response received:", text);

    try {
      // Clean the response text
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }
      
      // Try to parse the response as JSON
      const emails = JSON.parse(cleanText);
      
      // Validate that we have an array of emails
      if (!Array.isArray(emails)) {
        throw new Error("Response is not an array");
      }

      // Validate each email address in the response
      const validatedEmails = emails.filter(emailData => {
        if (emailData.email && EmailValidator.validate(emailData.email)) {
          return true;
        } else {
          console.warn('Invalid email filtered out from Gemini response:', emailData.email);
          return false;
        }
      });

      console.log(`Successfully generated and validated ${validatedEmails.length} out of ${emails.length} email addresses`);

      res.json({
        success: true,
        emails: validatedEmails,
        contextUsed: contextData || "No context provided",
      });
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.log("Raw response:", text);
      
      // Fallback: return the text response with a note
      res.json({
        success: false,
        error: "Failed to parse structured response",
        rawResponse: text,
        contextUsed: contextData || "No context provided",
      });
    }

  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ 
      error: "Error generating emails with Gemini AI",
      details: err.message 
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Smart Email Finder API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      "GET /": "API information",
      "GET /search": "Search using SerpAPI (requires ?q parameter)",
      "GET /duckduckgo": "Search using DuckDuckGo (requires ?q parameter)", 
      "POST /generate-emails": "Generate email addresses using Gemini AI",
      "GET /hunter-domain-search": "Search domain using Hunter.io (requires ?domain parameter)",
      "GET /hunter-email-finder": "Find email using Hunter.io (requires ?domain, ?first_name, and ?last_name parameters)"
    },
    usage: {
      search: "GET /search?q=your+search+query",
      duckduckgo: "GET /duckduckgo?q=your+search+query",
      generateEmails: "POST /generate-emails with JSON body: { prompt, contextData, targetUser }",
      hunterDomainSearch: "GET /hunter-domain-search?domain=yourdomain.com",
      hunterEmailFinder: "GET /hunter-email-finder?domain=yourdomain.com&first_name=FirstName&last_name=LastName"
    },
    author: "Rishav Tiwari",
    timestamp: new Date().toISOString()
  });
});

app.listen(5000, () => console.log("Server running on port 5000"));
