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

// In-memory store (restart clears leads — add a DB for persistence)
export const leadsStore  = [];
export const emailsStore = [];

app.use('/api/search', searchRouter);
app.use('/api/leads',  leadsRouter);
app.use('/api/email',  emailRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'US Outreach API running',
    dataSource: 'OpenStreetMap + Overpass API (free, no key needed)',
    leads: leadsStore.length,
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
