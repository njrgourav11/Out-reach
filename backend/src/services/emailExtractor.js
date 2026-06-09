import axios from 'axios';
import * as cheerio from 'cheerio';

// Common contact page paths to check
const CONTACT_PATHS = [
  '/contact', '/contact-us', '/about', '/about-us',
  '/reach-us', '/get-in-touch', '/info', '/help',
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Emails to skip (generic/spam)
const SKIP_EMAILS = [
  'noreply', 'no-reply', 'donotreply', 'privacy', 'legal',
  'press', 'media', 'sentry', 'mailer', 'example', 'test',
  'support@sentry', 'admin@', 'webmaster@',
];

export async function extractEmail(websiteUrl) {
  if (!websiteUrl) return null;

  try {
    const baseUrl = normalizeUrl(websiteUrl);

    // Try homepage first
    let email = await scrapeEmailFromUrl(baseUrl);
    if (email) return email;

    // Try contact pages
    for (const path of CONTACT_PATHS) {
      email = await scrapeEmailFromUrl(baseUrl + path);
      if (email) return email;
      await sleep(300);
    }

    return null;
  } catch {
    return null;
  }
}

async function scrapeEmailFromUrl(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OutreachBot/1.0)',
        'Accept': 'text/html',
      },
      maxRedirects: 3,
    });

    const $ = cheerio.load(data);
    $('script, style, noscript').remove();

    const text = $.html();
    const emails = text.match(EMAIL_REGEX) || [];

    for (const email of emails) {
      const lower = email.toLowerCase();
      const isSpam = SKIP_EMAILS.some(s => lower.includes(s));
      if (!isSpam && isValidEmail(email)) {
        return email.toLowerCase();
      }
    }

    // Also check mailto links specifically
    let mailtoEmail = null;
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const email = href.replace('mailto:', '').split('?')[0].trim();
      if (email && isValidEmail(email)) {
        mailtoEmail = email.toLowerCase();
        return false; // break
      }
    });

    return mailtoEmail;
  } catch {
    return null;
  }
}

function normalizeUrl(url) {
  if (!url.startsWith('http')) url = 'https://' + url;
  return url.replace(/\/$/, '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 100;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
