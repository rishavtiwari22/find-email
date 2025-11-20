// Hunter.io API configuration
const HUNTER_API_KEY = '910da5b7858fa2c7146e356c8d69610e285929c3';
const HUNTER_API_BASE_URL = 'https://api.hunter.io/v2';

// DOM elements
const form = document.getElementById('emailForm');
const domainInput = document.getElementById('domain');
const searchBtn = document.getElementById('searchBtn');
const spinner = document.getElementById('spinner');
const resultsDiv = document.getElementById('results');

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const domain = domainInput.value.trim();
    
    if (!domain) {
        showError('Please enter a domain name');
        return;
    }
    
    await searchDomainEmails(domain);
});

// Search domain emails function
async function searchDomainEmails(domain) {
    // Show loading state
    setLoadingState(true);
    clearResults();
    
    try {
        // Construct API URL
        const apiUrl = `${HUNTER_API_BASE_URL}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}`;
        
        console.log('Making request to:', apiUrl);
        
        // Make API request
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (!response.ok) {
            throw new Error(data.errors?.[0]?.details || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Display results
        displayDomainResults(data, domain);
        
    } catch (error) {
        console.error('Error searching domain emails:', error);
        showError(`Failed to search domain emails: ${error.message}`);
    } finally {
        setLoadingState(false);
    }
}

// Display domain search results
function displayDomainResults(data, domain) {
    if (data.data && data.data.emails && data.data.emails.length > 0) {
        // Emails found
        showDomainResults(data.data, domain);
    } else {
        // No emails found
        showNoEmailsResult(domain);
    }
}

// Show domain search results
function showDomainResults(domainData, domain) {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card success';
    
    const emails = domainData.emails || [];
    const organization = domainData.organization || domain;
    
    resultCard.innerHTML = `
        <div class="result-title success">
            <span class="icon"></span>
            ${emails.length} Email${emails.length > 1 ? 's' : ''} Found!
        </div>
        
        <div class="email-info">
            <div class="info-item">
                <div class="info-label">Organization</div>
                <div class="info-value">${organization}</div>
            </div>
            
            <div class="info-item">
                <div class="info-label">Domain</div>
                <div class="info-value">${domain}</div>
            </div>
            
            <div class="info-item">
                <div class="info-label">Total Emails Found</div>
                <div class="info-value">${emails.length}</div>
            </div>
        </div>
        
        <div class="emails-list">
            <h4>Email Addresses</h4>
            ${emails.map(email => `
                <div class="email-item">
                    <div class="email-details">
                        <div class="email-address">
                            <span class="email-value">${email.value}</span>
                            <button class="copy-btn" onclick="copyToClipboard('${email.value}')">Copy</button>
                        </div>
                        ${email.first_name || email.last_name ? `
                            <div class="email-name">${(email.first_name || '') + ' ' + (email.last_name || '')}</div>
                        ` : ''}
                        ${email.position ? `<div class="email-position">${email.position}</div>` : ''}
                        <div class="email-stats">
                            <span class="confidence">Confidence: ${email.confidence || 0}%</span>
                            ${email.type ? `<span class="email-type">Type: ${email.type}</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    resultsDiv.appendChild(resultCard);
}

// Show no emails found
function showNoEmailsResult(domain) {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card no-result';
    
    resultCard.innerHTML = `
        <div class="result-title no-result">
            <span class="icon"></span>
            No Emails Found
        </div>
        
        <div class="email-info">
            <div class="info-item">
                <div class="info-label">Domain Searched</div>
                <div class="info-value">${domain}</div>
            </div>
            
            <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">No public email addresses found for this domain</div>
            </div>
        </div>
        
        <p style="margin-top: 15px; color: #856404; font-size: 0.9rem;">
            💡 <strong>Tip:</strong> Try checking the domain spelling, or the domain might not have public email addresses indexed by Hunter.io.
        </p>
    `;
    
    resultsDiv.appendChild(resultCard);
}

// Show error message
function showError(message) {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card error';
    
    resultCard.innerHTML = `
        <div class="result-title error">
            <span class="icon"></span>
            Error
        </div>
        
        <div class="email-info">
            <div class="info-item">
                <div class="info-label">Error Message</div>
                <div class="info-value">${message}</div>
            </div>
        </div>
        
        <p style="margin-top: 15px; color: #721c24; font-size: 0.9rem;">
            💡 <strong>Common issues:</strong> Check your internet connection, verify the domain exists, or try again in a few moments.
        </p>
    `;
    
    resultsDiv.appendChild(resultCard);
}

// Set loading state
function setLoadingState(isLoading) {
    searchBtn.disabled = isLoading;
    
    if (isLoading) {
        searchBtn.classList.add('loading');
    } else {
        searchBtn.classList.remove('loading');
    }
}

// Clear previous results
function clearResults() {
    resultsDiv.innerHTML = '';
}

// Copy email to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Show temporary success message
        const copyBtn = event.target;
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.background = '#007bff';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#28a745';
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            event.target.textContent = 'Copied!';
            setTimeout(() => {
                event.target.textContent = 'Copy';
            }, 2000);
        } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
        }
        
        document.body.removeChild(textArea);
    }
}

// Add some example functionality
document.addEventListener('DOMContentLoaded', () => {
    // Add example button functionality
    const exampleBtn = document.createElement('button');
    exampleBtn.textContent = '📝 Try Example';
    exampleBtn.style.cssText = `
        background: #17a2b8;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        margin-bottom: 20px;
        transition: background 0.3s ease;
    `;
    
    exampleBtn.onmouseover = () => exampleBtn.style.background = '#138496';
    exampleBtn.onmouseout = () => exampleBtn.style.background = '#17a2b8';
    
    exampleBtn.onclick = () => {
        domainInput.value = 'stripe.com';
    };
    
    // Insert example button before the form
    form.parentNode.insertBefore(exampleBtn, form);
});

// Handle input validation
function validateInput(input) {
    const value = input.value.trim();
    
    if (input === domainInput) {
        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
        if (value && !domainRegex.test(value)) {
            input.style.borderColor = '#dc3545';
            return false;
        }
    }
    
    if (value) {
        input.style.borderColor = '#28a745';
        return true;
    } else {
        input.style.borderColor = '#e1e5e9';
        return false;
    }
}

// Add real-time validation
domainInput.addEventListener('blur', () => validateInput(domainInput));
domainInput.addEventListener('input', () => {
    if (domainInput.style.borderColor === '#dc3545') {
        validateInput(domainInput);
    }
});
