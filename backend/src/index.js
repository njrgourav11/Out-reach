import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import leadsRouter  from './routes/leads.js';
import emailRouter  from './routes/email.js';
import searchRouter from './routes/search.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const EMAILS_FILE = path.join(DATA_DIR, 'emails.json');

export let leadsStore = [];
export let emailsStore = [];

// Load initial data from disk if it exists
try {
  if (fs.existsSync(LEADS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')) || [];
    leadsStore = raw.filter(l => !l.website);
    console.log(`💾 Loaded ${leadsStore.length} leads from disk (filtered for no website)`);
  }
} catch (err) {
  console.error('Failed to load leads from disk:', err.message);
}

try {
  if (fs.existsSync(EMAILS_FILE)) {
    emailsStore = JSON.parse(fs.readFileSync(EMAILS_FILE, 'utf8'));
    console.log(`💾 Loaded ${emailsStore.length} email logs from disk`);
  }
} catch (err) {
  console.error('Failed to load email logs from disk:', err.message);
}

// Save leads and emails to disk
export function saveToDisk() {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leadsStore, null, 2), 'utf8');
    fs.writeFileSync(EMAILS_FILE, JSON.stringify(emailsStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save data to disk:', err.message);
  }
}

app.use('/api/search', searchRouter);
app.use('/api/leads',  leadsRouter);
app.use('/api/email',  emailRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'US Outreach API running',
    dataSource: process.env.GOOGLE_PLACES_API_KEY ? 'Google Maps API' : 'OSM API (Free)',
    leads: leadsStore.length,
    config: {
      name: process.env.YOUR_NAME || 'Gourav',
      brand: process.env.YOUR_BRAND || 'Gourav.blog',
      portfolio: process.env.YOUR_PORTFOLIO || 'https://gourav.blog',
      services: process.env.YOUR_SERVICES || 'website development, full stack development, app development',
      email: process.env.GMAIL_USER || 'njrgourav@gmail.com',
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 US Outreach API → http://localhost:${PORT}`);
  console.log(`🗺️  Data source: OpenStreetMap + Overpass API (100% free)`);
  console.log(`\n📋 Endpoints:`);
  console.log(`   POST /api/search              - Search businesses`);
  console.log(`   GET  /api/leads               - Get all leads`);
  console.log(`   GET  /api/leads/export.csv    - Export leads as CSV`);
  console.log(`   POST /api/email/generate-bulk - AI generate emails`);
  console.log(`   POST /api/email/send/:id      - Send email\n`);
});

// Restart trigger comment (nvidia key reload)
