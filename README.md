# Smart Email Finder 🔍📧

A powerful AI-driven application that finds and generates professional email addresses using web search data and machine learning. Built with React frontend and Node.js backend, deployed on Vercel.

![Smart Email Finder](https://img.shields.io/badge/Status-Live-brightgreen)
![React](https://img.shields.io/badge/React-18+-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)

## 🌟 Features

### 🔍 Multi-Source Search
- **SerpAPI Integration**: Get comprehensive Google search results
- **DuckDuckGo API**: Privacy-focused search alternative
- **Auto-Fallback**: Automatic switching between search engines
- **Source Selection**: Manual control over which search engine to use

### 🤖 AI-Powered Email Generation
- **Gemini AI Integration**: Advanced email pattern analysis
- **Context-Aware Generation**: Uses company data to generate realistic emails
- **Pattern Recognition**: Identifies common email formats (firstname.lastname@domain.com)
- **Personalized Results**: Generates specific emails when user name is provided

### ✅ Email Validation & Filtering
- **Real-time Validation**: Validates all found and generated emails
- **Duplicate Removal**: Intelligent deduplication of email addresses
- **Confidence Scoring**: High/Medium/Low confidence ratings
- **Format Verification**: Ensures proper email format standards

### 🎨 Modern UI/UX
- **Responsive Design**: Works perfectly on desktop and mobile
- **Real-time Search**: Instant results with loading states
- **Copy to Clipboard**: One-click email copying
- **Visual Indicators**: Clear validation status and confidence levels
- **Dark/Light Theme**: Modern styling with Tailwind CSS

## 🚀 Live Demo

**Frontend**: [https://find-email-jnru.vercel.app/]  

## 🏗️ Tech Stack

### Frontend
- **React 18+** with Vite
- **Tailwind CSS** for styling
- **Email Validator** for client-side validation
- **Modern ES6+** JavaScript

### Backend
- **Node.js** with Express.js
- **Google Gemini AI** for email generation
- **SerpAPI** for Google search results
- **DuckDuckGo API** for alternative search
- **Email Validator** for server-side validation

### Deployment
- **Vercel** for both frontend and backend
- **Environment Variables** for secure API key management
- **Serverless Functions** for optimal performance

## 📦 Installation & Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- SerpAPI account (free tier available)
- Google Gemini AI API key

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/find-email.git
cd find-email
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
SERPAPI_KEY=your_serpapi_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

Start the backend server:
```bash
npm start
# or for development
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `.env` file in the frontend directory:
```env
VITE_API_BASE_URL=http://localhost:5000
# For production: VITE_API_BASE_URL=https://your-backend-url.vercel.app
```

Start the frontend development server:
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
SERPAPI_KEY=your_serpapi_key_here          # Get from serpapi.com
GEMINI_API_KEY=your_gemini_api_key_here    # Get from Google AI Studio
PORT=5000                                   # Optional: Server port
NODE_ENV=production                         # Optional: Environment
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=your_backend_url_here    # Backend API URL
```

### API Keys Setup

1. **SerpAPI Key**:
   - Visit [serpapi.com](https://serpapi.com)
   - Sign up for a free account
   - Get your API key from the dashboard

2. **Gemini AI Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key to your environment variables


## 🎯 Usage Examples

### Basic Company Search
1. Enter company name (e.g., "NavGurukul")
2. Select search source (SerpAPI/DuckDuckGo/Auto)
3. Click "Search"
4. View found emails and AI-generated suggestions

### Personalized Email Generation
1. Enter company name
2. Enter specific user name (e.g., "John Doe")
3. System will generate 5 personalized email addresses
4. Copy desired emails with one click

### Search Source Selection
- **SerpAPI**: Most comprehensive results
- **DuckDuckGo**: Privacy-focused, good for general searches
- **Auto**: Tries SerpAPI first, falls back to DuckDuckGo


## 🔒 Security & Privacy

- **No Credential Storage**: API keys stored securely in environment variables
- **Input Validation**: All inputs validated on both client and server
- **Email Validation**: Comprehensive validation prevents invalid emails
- **Rate Limiting**: Built-in protection against API abuse
- **CORS Enabled**: Secure cross-origin resource sharing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 📧 Support

For support, email [tiwaririshav463@gmail.com] or create an issue on GitHub.

## 🙏 Acknowledgments

- [SerpAPI](https://serpapi.com) for search functionality
- [Google Gemini AI](https://ai.google.dev/) for email generation
- [Vercel](https://vercel.com) for hosting and deployment
- [Tailwind CSS](https://tailwindcss.com) for styling

---

Made with ❤️ by [Rishav Tiwari]
