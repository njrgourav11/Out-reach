import { Router } from 'express';
import { leadsStore } from '../index.js';

const router = Router();

// GET /api/leads
router.get('/', (req, res) => {
  const { status, emailStatus, city, niche } = req.query;
  let leads = [...leadsStore];

  if (status)      leads = leads.filter(l => l.outreachStatus === status);
  if (emailStatus) leads = leads.filter(l => l.emailStatus === emailStatus);
  if (city)        leads = leads.filter(l => l.city?.toLowerCase().includes(city.toLowerCase()));
  if (niche)       leads = leads.filter(l => l.businessType?.toLowerCase().includes(niche.toLowerCase()));

  res.json({ total: leads.length, stats: getStats(), leads });
});

// GET /api/leads/stats
router.get('/stats', (req, res) => res.json(getStats()));

// GET /api/leads/export.csv
router.get('/export.csv', (req, res) => {
  const rows = leadsStore.map(l => [
    csvCell(l.name),
    csvCell(l.businessType),
    csvCell(l.city),
    csvCell(l.email),
    csvCell(l.phone),
    csvCell(l.website),
    csvCell(l.address),
    csvCell(l.emailStatus),
    csvCell(l.outreachStatus),
  ].join(','));

  const header = 'Name,Type,City,Email,Phone,Website,Address,Email Status,Outreach Status';
  const csv = [header, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sandysource-leads.csv"');
  res.send(csv);
});

// GET /api/leads/:id
router.get('/:id', (req, res) => {
  const lead = leadsStore.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

// PATCH /api/leads/:id
router.patch('/:id', (req, res) => {
  const lead = leadsStore.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const allowed = ['outreachStatus', 'email', 'emailStatus', 'notes', 'draftSubject', 'draftBody'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) lead[key] = req.body[key];
  }
  lead.updatedAt = new Date().toISOString();
  res.json({ success: true, lead });
});

// DELETE /api/leads/:id
router.delete('/:id', (req, res) => {
  const idx = leadsStore.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Lead not found' });
  leadsStore.splice(idx, 1);
  res.json({ success: true });
});

// DELETE /api/leads — clear all
router.delete('/', (req, res) => {
  leadsStore.length = 0;
  res.json({ success: true, message: 'All leads cleared' });
});

function getStats() {
  return {
    total:            leadsStore.length,
    emailFound:       leadsStore.filter(l => l.emailStatus === 'found').length,
    emailPending:     leadsStore.filter(l => l.emailStatus === 'pending').length,
    emailNotFound:    leadsStore.filter(l => l.emailStatus === 'not_found').length,
    outreachNew:      leadsStore.filter(l => l.outreachStatus === 'new').length,
    outreachDrafted:  leadsStore.filter(l => l.outreachStatus === 'drafted').length,
    outreachSent:     leadsStore.filter(l => l.outreachStatus === 'sent').length,
    withWebsite:      leadsStore.filter(l => l.website).length,
  };
}

function csvCell(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default router;
