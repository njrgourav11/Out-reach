import axios from 'axios';

// Popular generic public email domains that do not represent a business website
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'gmx.com',
  'yandex.com',
  'msn.com',
  'comcast.net',
  'bellsouth.net',
  'verizon.net',
  'cox.net',
  'charter.net',
  'sbcglobal.net'
]);

/**
 * Checks if a business email domain has an active website.
 * @param {string} email 
 * @returns {Promise<boolean>} True if an active website is found at the domain, false otherwise.
 */
export async function checkEmailDomainHasWebsite(email) {
  if (!email) return false;
  const parts = email.split('@');
  if (parts.length < 2) return false;
  
  const domain = parts[1].toLowerCase().trim();

  // If it's a generic public email provider, it does not host a business website
  if (PUBLIC_EMAIL_DOMAINS.has(domain)) {
    return false;
  }

  // Attempt to check if there is an active website hosted at the domain
  const protocols = ['http://', 'https://'];
  
  for (const protocol of protocols) {
    try {
      console.log(`   🌐 Verifying if domain has website: ${protocol}${domain}`);
      const response = await axios.get(`${protocol}${domain}`, {
        timeout: 4000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; USOutreachVerificationBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml'
        },
        maxRedirects: 2,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      if (response.status >= 200 && response.status < 400) {
        console.log(`   ⚠️ Active website detected at ${protocol}${domain} (status: ${response.status})`);
        return true; // Website is active!
      }
    } catch (err) {
      // Continue to next protocol or fail silently
    }
  }

  return false; // No website detected
}
