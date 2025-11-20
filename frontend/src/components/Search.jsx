import { useState } from 'react'
import * as EmailValidator from 'email-validator'

const SearchComponent = () => {
  const [inputValue, setInputValue] = useState('')
  const [userName, setUserName] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState('')
  const [generatedEmails, setGeneratedEmails] = useState([])
  const [foundEmails, setFoundEmails] = useState([])
  const [hunterEmails, setHunterEmails] = useState([])
  const [selectedSource, setSelectedSource] = useState('hunter') // Default to Hunter.io
  const [domainInput, setDomainInput] = useState('')

  // Get API base URL from environment variables
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  
  // Debug: Log the current API URL being used
  console.log('Using API Base URL:', API_BASE_URL)

  const fetchSerpApiData = async (query) => {
    try {
      const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      const result = {
        query: query,
        timestamp: new Date().toLocaleString(),
        source: 'SerpAPI (Backend)',
        answerBox: data.answer_box || null,
        knowledgeGraph: data.knowledge_graph || null,
        organicResults: data.organic_results?.slice(0, 5) || [],
        relatedSearches: data.related_searches?.slice(0, 3) || [],
        peopleAlsoAsk: data.people_also_ask?.slice(0, 3) || []
      }
      
      console.log(result);
      return result
    } catch (err) {
      console.error('Backend SerpAPI Error:', err)
      throw err
    }
  }

  const fetchDuckDuckGoData = async (query) => {
    try {
      const response = await fetch(`${API_BASE_URL}/duckduckgo?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        throw new Error(`DuckDuckGo API error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      const result = {
        query: query,
        timestamp: new Date().toLocaleString(),
        source: 'DuckDuckGo (Backend)',
        abstract: data.Abstract || '',
        abstractText: data.AbstractText || '',
        abstractSource: data.AbstractSource || '',
        abstractURL: data.AbstractURL || '',
        answer: data.Answer || '',
        answerType: data.AnswerType || '',
        definition: data.Definition || '',
        definitionSource: data.DefinitionSource || '',
        definitionURL: data.DefinitionURL || '',
        infobox: data.Infobox || null,
        relatedTopics: data.RelatedTopics?.slice(0, 3) || [],
        results: data.Results?.slice(0, 3) || []
      }
      
      return result
    } catch (err) {
      console.error('DuckDuckGo API Error:', err)
      throw err
    }
  }

  const fetchHunterData = async (domain) => {
    try {
      const response = await fetch(`${API_BASE_URL}/hunter-domain-search?domain=${encodeURIComponent(domain)}`)
      
      if (!response.ok) {
        throw new Error(`Hunter.io API error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      const result = {
        query: domain,
        timestamp: new Date().toLocaleString(),
        source: 'Hunter.io (Backend)',
        domain: data.data?.domain || domain,
        organization: data.data?.organization || domain,
        emails: data.data?.emails || []
      }
      
      return result
    } catch (err) {
      console.error('Hunter.io API Error:', err)
      throw err
    }
  }

  const performSearch = async (query) => {
    setIsLoading(true)
    setError('')
    
    try {
      let result
      
      if (selectedSource === 'hunter') {
        try {
          result = await fetchHunterData(query)
          // Store Hunter emails separately for Gemini processing
          setHunterEmails(result.emails || [])
          
          // Also extract email data for context
          if (result.emails && result.emails.length > 0) {
            const hunterEmailData = result.emails.map(email => 
              `${email.first_name || ''} ${email.last_name || ''} - ${email.value} - ${email.position || 'Unknown'}`
            ).join('; ')
            
            setData(hunterEmailData)
            
            // Generate targeted emails if user name is provided
            if (userName.trim() && hunterEmailData.trim()) {
              try {
                const prompt = `Generate personalized email addresses for "${userName}" based on the Hunter.io email patterns found for ${query}`;
                const emailAddresses = await generateEmailTemplates(prompt, hunterEmailData, userName);
                console.log('Generated emails based on Hunter.io data:', emailAddresses);
                setGeneratedEmails(emailAddresses);
              } catch (error) {
                console.error('Failed to generate emails from Hunter.io data:', error);
              }
            }
          }
        } catch (hunterError) {
          console.error('Hunter.io failed:', hunterError)
          throw new Error('Hunter.io search failed. Please check if the domain exists or try another API.')
        }
      } else if (selectedSource === 'serpapi') {
        try {
          result = await fetchSerpApiData(query)
        } catch (serpError) {
          console.error('SerpAPI failed:', serpError)
          throw new Error('SerpAPI search failed. Please try DuckDuckGo or check if the backend server is running.')
        }
      } else if (selectedSource === 'duckduckgo') {
        try {
          result = await fetchDuckDuckGoData(query)
        } catch (duckError) {
          console.error('DuckDuckGo failed:', duckError)
          throw new Error('DuckDuckGo search failed. Please try SerpAPI or check if the backend server is running.')
        }
      } else if (selectedSource === 'auto') {
        // Auto mode: Try SerpAPI first, fallback to DuckDuckGo
        try {
          result = await fetchSerpApiData(query)
        } catch (serpError) {
          console.log('SerpAPI failed, falling back to DuckDuckGo:', serpError)
          try {
            result = await fetchDuckDuckGoData(query)
          } catch (duckError) {
            console.log('DuckDuckGo also failed:', duckError)
            throw new Error('Both SerpAPI and DuckDuckGo failed. Please check if the backend server is running.')
          }
        }
      }
      
      // Extract and print snippet data automatically (for non-hunter sources)
      if (selectedSource !== 'hunter') {
        await extractSnippetData(result)
      }
      
      setSearchResults(prev => [result, ...prev])
    } catch (err) {
      setError(err.message || 'Failed to fetch data from search APIs.')
      console.error('Search failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      await performSearch(inputValue.trim())
      setInputValue('')
    }
  }

  const handleClear = () => {
    setSearchResults([])
    setGeneratedEmails([])
    setFoundEmails([])
    setHunterEmails([])
    setError('')
    setUserName('')
    setDomainInput('')
  }

  // Function to extract and store snippet data from organic results
  const extractSnippetData = async (searchResult) => {
    let extractedData = ''
    let foundEmailAddresses = []
    
    if (searchResult.organicResults && searchResult.organicResults.length > 0) {
      searchResult.organicResults.forEach((result, index) => {
        const snippetDataString = result.title + " -- " + result.snippet + " -- " + result.snippet_highlighted_words
        extractedData += snippetDataString

        // Extract email addresses from snippets using regex
        const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g
        const foundEmails = (result.snippet || '').match(emailRegex)
        if (foundEmails) {
          foundEmails.forEach(email => {
            // Clean and validate email before adding
            const cleanEmail = email.toLowerCase().trim()
            if (EmailValidator.validate(cleanEmail) && !foundEmailAddresses.some(e => e.email === cleanEmail)) {
              foundEmailAddresses.push({
                email: cleanEmail,
                source: result.title || 'Search Result',
                confidence: 'found'
              })
              console.log(`✅ Valid email found: ${cleanEmail}`)
            } else {
              console.log(`❌ Invalid email filtered out: ${email}`)
            }
          })
        }

        // Also check highlighted words for emails
        if (result.snippet_highlighted_words) {
          result.snippet_highlighted_words.forEach(word => {
            // Clean and validate email before adding
            const cleanWord = word.toLowerCase().trim()
            if (EmailValidator.validate(cleanWord) && !foundEmailAddresses.some(e => e.email === cleanWord)) {
              foundEmailAddresses.push({
                email: cleanWord,
                source: result.title || 'Search Result (Highlighted)',
                confidence: 'found'
              })
              console.log(`✅ Valid email found in highlights: ${cleanWord}`)
            } else if (word.includes('@')) {
              console.log(`❌ Invalid email filtered out from highlights: ${word}`)
            }
          })
        }
      })
    }
    
    // Store extracted data and found emails
    setData(extractedData)
    setFoundEmails(foundEmailAddresses)
    
    console.log('Final extracted data:', extractedData);
    console.log(`✅ Found and validated ${foundEmailAddresses.length} email addresses:`, foundEmailAddresses);
    
    // Generate email addresses based on user input
    if (extractedData.trim()) {
      try {
        let prompt
        if (userName.trim()) {
          // If user name is provided, generate specific emails for that user
          prompt = `Generate 5 high-probability email addresses for the user "${userName}" based on the email patterns found in the following company data about ${searchResult.query}`;
        } else {
          // If no user name, generate general employee emails
          prompt = `Generate email addresses for employees based on the following search results about ${searchResult.query}`;
        }
        
        const emailAddresses = await generateEmailTemplates(prompt, extractedData, userName);
        console.log('Auto-generated email addresses:', emailAddresses);
        setGeneratedEmails(emailAddresses);
      } catch (error) {
        console.error('Failed to auto-generate email addresses:', error);
      }
    }
    
    return extractedData;
  }

  // Function to generate personalized email for a specific user based on Hunter.io data
  const generatePersonalizedEmail = async (hunterEmail, targetUserName) => {
    if (!targetUserName.trim()) {
      setError('Please enter a user name to generate personalized emails')
      return
    }

    setIsLoading(true)
    try {
      // Create context from Hunter.io data
      const contextData = `
        Company Domain: ${hunterEmail.value.split('@')[1]}
        Sample Employee: ${hunterEmail.first_name} ${hunterEmail.last_name} - ${hunterEmail.value}
        Position: ${hunterEmail.position || 'Unknown'}
        Department: ${hunterEmail.department || 'Unknown'}
        Email Pattern Analysis: ${hunterEmail.value}
        Additional Hunter.io emails: ${hunterEmails.map(e => e.value).join(', ')}
      `

      const prompt = `Generate 5 high-probability email addresses for "${targetUserName}" based on the email patterns found in this company's Hunter.io data`

      const emailAddresses = await generateEmailTemplates(prompt, contextData, targetUserName)
      console.log(`Generated personalized emails for ${targetUserName}:`, emailAddresses)
      
      // Add to generated emails with a note about the source
      const personalizedEmails = emailAddresses.map(email => ({
        ...email,
        source: `Generated from Hunter.io pattern: ${hunterEmail.value}`,
        confidence: email.confidence || 'high'
      }))
      
      setGeneratedEmails(prev => [...personalizedEmails, ...prev])
      
    } catch (error) {
      console.error('Failed to generate personalized email:', error)
      setError(`Failed to generate personalized email: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to generate email addresses using Gemini AI
  const generateEmailTemplates = async (prompt, contextData, targetUser = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/generate-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          contextData: contextData,
          targetUser: targetUser
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Generated Email Addresses:', result.emails);
        
        // Validate all generated emails before returning
        const validatedEmails = result.emails.filter(emailData => {
          if (emailData.email && EmailValidator.validate(emailData.email)) {
            return true;
          } else {
            console.warn('Invalid email filtered out:', emailData.email);
            return false;
          }
        });
        
        console.log(`✅ Validated ${validatedEmails.length} out of ${result.emails.length} generated emails`);
        
        // Show notification if some emails were filtered out
        if (validatedEmails.length < result.emails.length) {
          console.warn(`⚠️  ${result.emails.length - validatedEmails.length} invalid emails were filtered out from AI response`);
        }
        
        return validatedEmails;
      } else {
        console.error('Email address generation failed:', result.error);
        console.log('Raw response:', result.rawResponse);
        throw new Error(result.error || 'Failed to generate email addresses');
      }
    } catch (error) {
      console.error('Error generating email addresses:', error);
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Smart Email Finder</h1>
          <p className="text-slate-600 text-lg">Find & Generate Professional Email Addresses</p>
          <div className="flex justify-center gap-2 mt-3">
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full">
              Multi-Source Search
            </span>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
              AI Email Generation
            </span>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
              Email Validation
            </span>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="input-field" className="block text-sm font-medium text-slate-700 mb-2">
                {selectedSource === 'hunter' ? 'Domain Name' : 'Company Name / Search Query'}
              </label>
              <input
                id="input-field"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={selectedSource === 'hunter' 
                  ? 'Enter domain... e.g., stripe.com, google.com, microsoft.com' 
                  : "Enter company name... e.g., 'NavGurukul', 'Google', 'Microsoft', etc."}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 placeholder-slate-400"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="user-name-field" className="block text-sm font-medium text-slate-700 mb-2">
                User Name (Optional)
              </label>
              <input
                id="user-name-field"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter user name... e.g., 'John Doe', 'Priya Sharma', etc."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 placeholder-slate-400"
                disabled={isLoading}
              />
              <p className="text-xs text-slate-500 mt-1">
                If provided, we'll generate personalized email addresses for this user based on company patterns
              </p>
            </div>
            <div>
              <label htmlFor="source-select" className="block text-sm font-medium text-slate-700 mb-2">
                Search Source
              </label>
              <select
                id="source-select"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white"
                disabled={isLoading}
              >
                <option value="hunter">Hunter.io (Email Domain Search)</option>
                <option value="serpapi">SerpAPI (Google Search Results)</option>
                <option value="duckduckgo">DuckDuckGo (Privacy-focused Search)</option>
                <option value="auto">Auto (SerpAPI → DuckDuckGo Fallback)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {selectedSource === 'hunter' 
                  ? 'Find professional emails for a specific domain (e.g., stripe.com)'
                  : 'Choose your preferred search engine for finding company information'}
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </button>
              {searchResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  disabled={isLoading}
                >
                  Clear All
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Found Email Addresses */}
        {foundEmails.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">
                Found Email Addresses ({foundEmails.length})
              </h2>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                ✓ All Validated
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {foundEmails.map((emailData, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start justify-between mb-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      Found #{index + 1}
                    </span>
                    <div className="flex gap-1">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        ✓ Validated
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {emailData.confidence}
                      </span>
                    </div>
                  </div>
                  <p className="text-blue-600 font-mono text-sm mb-2 break-all font-semibold">{emailData.email}</p>
                  {emailData.source && (
                    <p className="text-xs text-slate-600">Source: {emailData.source}</p>
                  )}
                  <button 
                    onClick={() => navigator.clipboard.writeText(emailData.email)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Copy Email
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hunter.io Found Email Addresses */}
        {hunterEmails.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">
                Hunter.io Domain Emails ({hunterEmails.length})
              </h2>
              <div className="flex gap-2">
                <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  🎯 Hunter.io
                </span>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  ✓ Professional Emails
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hunterEmails.map((email, index) => (
                <div key={index} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-start justify-between mb-2">
                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                      #{index + 1}
                    </span>
                    <div className="flex gap-1">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        ✓ Verified
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        email.confidence >= 80 ? 'bg-green-100 text-green-800' :
                        email.confidence >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {email.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  {(email.first_name || email.last_name) && (
                    <h3 className="font-semibold text-slate-800 mb-1">
                      {email.first_name} {email.last_name}
                    </h3>
                  )}
                  <p className="text-purple-600 font-mono text-sm mb-2 break-all font-semibold">{email.value}</p>
                  {email.position && (
                    <p className="text-slate-600 text-sm mb-2">{email.position}</p>
                  )}
                  {email.department && (
                    <p className="text-slate-500 text-xs mb-2">Department: {email.department}</p>
                  )}
                  {email.type && (
                    <p className="text-slate-500 text-xs mb-2">Type: {email.type}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => navigator.clipboard.writeText(email.value)}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Copy Email
                    </button>
                    {userName.trim() && (
                      <button 
                        onClick={() => generatePersonalizedEmail(email, userName)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        disabled={isLoading}
                      >
                        Generate for {userName}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {userName.trim() && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm mb-2">
                  💡 <strong>Tip:</strong> Click "Generate for {userName}" on any email to create personalized email addresses using AI based on the company's email patterns.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generated Email Addresses */}
        {generatedEmails.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">
                {userName.trim() ? `Generated Email Addresses for "${userName}"` : 'Generated Email Addresses'} ({generatedEmails.length})
              </h2>
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full">
                🤖 AI Generated & Validated
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedEmails.map((emailData, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      #{index + 1}
                    </span>
                    <div className="flex gap-1">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        ✓ Validated
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        emailData.confidence === 'high' ? 'bg-green-100 text-green-800' :
                        emailData.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {emailData.confidence} confidence
                      </span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{emailData.name}</h3>
                  <p className="text-blue-600 font-mono text-sm mb-2 break-all">{emailData.email}</p>
                  {emailData.role && (
                    <p className="text-slate-600 text-sm mb-2">{emailData.role}</p>
                  )}
                  {emailData.source && (
                    <p className="text-xs text-slate-500">Source: {emailData.source}</p>
                  )}
                  <button 
                    onClick={() => navigator.clipboard.writeText(emailData.email)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Copy Email
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Search Results ({searchResults.length})
          </h2>
          
          {searchResults.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-slate-500">No searches yet</p>
              <p className="text-sm text-slate-400 mt-1">Enter a question above and click "Search" to get instant answers</p>
            </div>
          ) : (
            <div className="space-y-6">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="bg-slate-50 rounded-lg p-6 border border-slate-200 hover:border-slate-300 transition duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                        #{index + 1}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">{result.query}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-500">{result.timestamp}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            result.source.includes('SerpAPI') 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {result.source}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSearchResults(searchResults.filter((_, i) => i !== index))}
                      className="text-slate-400 hover:text-red-500 transition duration-200 p-1"
                      title="Remove this search"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* SerpAPI Answer Box */}
                  {result.answerBox && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Answer Box:</h4>
                      <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
                        {result.answerBox.answer && (
                          <p className="text-slate-800 font-medium mb-2">{result.answerBox.answer}</p>
                        )}
                        {result.answerBox.snippet && (
                          <p className="text-slate-700 text-sm">{result.answerBox.snippet}</p>
                        )}
                        {result.answerBox.link && (
                          <a
                            href={result.answerBox.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-xs mt-1 inline-block"
                          >
                            Source: {result.answerBox.displayed_link || result.answerBox.link}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Knowledge Graph */}
                  {result.knowledgeGraph && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Knowledge Graph:</h4>
                      <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
                        {result.knowledgeGraph.title && (
                          <h5 className="font-semibold text-slate-800 mb-2">{result.knowledgeGraph.title}</h5>
                        )}
                        {result.knowledgeGraph.description && (
                          <p className="text-slate-700 mb-2">{result.knowledgeGraph.description}</p>
                        )}
                        {result.knowledgeGraph.source && (
                          <p className="text-xs text-slate-500">Source: {result.knowledgeGraph.source.name}</p>
                        )}
                      </div>
                    </div>
                  )}


                  {/* Organic Results */}
                  {result.organicResults && result.organicResults.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Web Results:</h4>
                      <div className="space-y-3">
                        {result.organicResults.map((organic, orgIndex) => (
                          <div key={orgIndex} className="bg-white p-3 rounded border">
                            <h5 className="font-medium text-slate-800 mb-1">
                              <a
                                href={organic.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {organic.title}
                              </a>
                            </h5>
                            {organic.snippet && (
                              <p className="text-slate-600 text-sm mb-1">{organic.snippet}</p>
                            )}
                            <p className="text-xs text-slate-400">{organic.displayed_link || organic.link}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* People Also Ask */}
                  {result.peopleAlsoAsk && result.peopleAlsoAsk.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">People Also Ask:</h4>
                      <div className="space-y-2">
                        {result.peopleAlsoAsk.map((question, qIndex) => (
                          <div key={qIndex} className="bg-white p-3 rounded border">
                            <h5 className="font-medium text-slate-800 mb-1">{question.question}</h5>
                            {question.snippet && (
                              <p className="text-slate-600 text-sm">{question.snippet}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DuckDuckGo Answer */}
                  {result.answer && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Answer:</h4>
                      <p className="text-slate-800 bg-green-50 p-3 rounded border-l-4 border-green-400">{result.answer}</p>
                    </div>
                  )}

                  {/* Definition */}
                  {result.definition && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Definition:</h4>
                      <p className="text-slate-800 bg-blue-50 p-3 rounded border-l-4 border-blue-400">{result.definition}</p>
                      {result.definitionSource && (
                        <p className="text-xs text-slate-500 mt-1">Source: {result.definitionSource}</p>
                      )}
                    </div>
                  )}

                  {/* Abstract */}
                  {result.abstractText && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Summary:</h4>
                      <p className="text-slate-700 leading-relaxed">{result.abstractText}</p>
                      {result.abstractSource && (
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-slate-500">Source: {result.abstractSource}</p>
                          {result.abstractURL && (
                            <a
                              href={result.abstractURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              Read more
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Related Topics */}
                  {result.relatedTopics && result.relatedTopics.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Related Topics:</h4>
                      <div className="space-y-2">
                        {result.relatedTopics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="text-sm bg-white p-2 rounded border">
                            {topic.Text && (
                              <p className="text-slate-600">{topic.Text}</p>
                            )}
                            {topic.FirstURL && (
                              <a
                                href={topic.FirstURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline text-xs"
                              >
                                Learn more
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No data message */}
                  {!result.answer && !result.definition && !result.abstractText && 
                   (!result.organicResults || result.organicResults.length === 0) &&
                   (!result.relatedTopics || result.relatedTopics.length === 0) && 
                   !result.answerBox && !result.knowledgeGraph && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-yellow-800 text-sm">No instant answer available for this query. Try a different search term or a more specific question.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchComponent