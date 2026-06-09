import { Router } from 'express';
import { searchBusinesses } from '../services/osmPlaces.js';
import { extractEmail } from '../services/emailExtractor.js';
import { leadsStore } from '../index.js';

const router = Router();

// POST /api/search
// Body: { niche: "dentist", city: "Austin TX", limit: 20 }
router.post('/', async (req, res) => {
  const { niche, city, limit = 20 } = req.body;

  if (!niche || !city) {
    return res.status(400).json({ error: 'niche and city are required' });
  }

  try {
    console.log(`\n🔍 Searching: "${niche}" in "${city}" (limit: ${limit})`);
    const businesses = await searchBusinesses(niche, city, Number(limit));
    console.log(`✅ Found ${businesses.length} businesses`);

    // Add to leads store (skip duplicates)
    const existingIds = new Set(leadsStore.map(l => l.id));
    const newLeads = businesses.filter(b => !existingIds.has(b.id));
    leadsStore.push(...newLeads);

    res.json({
      success: true,
      found: businesses.length,
      newAdded: newLeads.length,
      source: 'openstreetmap',
      leads: businesses,
    });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/search/enrich/:id — extract email from one lead's website
router.post('/enrich/:id', async (req, res) => {
  const lead = leadsStore.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  console.log(`\n📧 Enriching: ${lead.name} (${lead.website || 'no website'})`);

  try {
    const email = await extractEmail(lead.website);
    lead.email = email;
    lead.emailStatus = email ? 'found' : 'not_found';
    lead.enrichedAt = new Date().toISOString();

    console.log(`   → Email: ${email || 'not found'}`);
    res.json({ success: true, email, lead });
  } catch (err) {
    lead.emailStatus = 'not_found';
    res.status(500).json({ error: err.message });
  }
});

// POST /api/search/enrich-all — enrich all pending + not_found leads (with retry support)
router.post('/enrich-all', async (req, res) => {
  const { retryFailed = false } = req.body;

  const pending = leadsStore.filter(l => {
    if (!l.website) return false;
    if (l.emailStatus === 'pending') return true;
    if (retryFailed && l.emailStatus === 'not_found') return true;
    return false;
  });

  if (pending.length === 0) {
    return res.json({ message: 'No leads to enrich', total: 0 });
  }

  console.log(`\n🔄 Enriching ${pending.length} leads (retryFailed=${retryFailed})...`);

  res.json({ message: `Starting enrichment for ${pending.length} leads`, total: pending.length });

  // Run in background — process sequentially to respect scraping etiquette
  (async () => {
    let found = 0;
    let failed = 0;
    for (const lead of pending) {
      try {
        const email = await extractEmail(lead.website);
        lead.email = email;
        lead.emailStatus = email ? 'found' : 'not_found';
        lead.enrichedAt = new Date().toISOString();
        if (email) {
          found++;
          console.log(`   ✅ ${lead.name}: ${email}`);
        } else {
          failed++;
          console.log(`   ❌ ${lead.name}: not found`);
        }
      } catch {
        lead.emailStatus = 'not_found';
        failed++;
      }
      await sleep(400); // polite delay between requests
    }
    console.log(`\n✅ Enrichment done. Found: ${found}, Not found: ${failed}`);
  })();
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default router;
