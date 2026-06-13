import { Router } from 'express';
import { generateColdEmail, generateBulkEmails } from '../services/nvidiaEmailGen.js';
import { sendEmail, verifyEmailConfig } from '../services/mailer.js';
import { leadsStore, emailsStore, saveToDisk } from '../index.js';

const router = Router();

// POST /api/email/generate/:leadId
router.post('/generate/:leadId', async (req, res) => {
  const lead = leadsStore.find(l => l.id === req.params.leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (lead.website) return res.status(400).json({ error: 'Cannot generate cold email for a lead who already has a website.' });

  console.log(`\n🤖 Generating email for: ${lead.name}`);

  try {
    const { subject, body } = await generateColdEmail(lead);
    lead.draftSubject = subject;
    lead.draftBody = body;
    lead.outreachStatus = 'drafted';
    lead.draftedAt = new Date().toISOString();
    saveToDisk();

    console.log(`   ✅ Subject: ${subject}`);
    res.json({ success: true, subject, body, lead });
  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/generate-bulk
router.post('/generate-bulk', async (req, res) => {
  const eligible = leadsStore.filter(
    l => l.emailStatus === 'found' && l.outreachStatus === 'new' && !l.website
  );

  if (eligible.length === 0) {
    return res.json({ message: 'No eligible leads (need emailStatus=found and outreachStatus=new)', count: 0 });
  }

  console.log(`\n🤖 Bulk generating emails for ${eligible.length} leads...`);
  res.json({ message: `Generating emails for ${eligible.length} leads`, total: eligible.length });

  (async () => {
    const results = await generateBulkEmails(eligible);
    let success = 0;
    for (const r of results) {
      const lead = leadsStore.find(l => l.id === r.leadId);
      if (lead && r.success) {
        lead.draftSubject = r.subject;
        lead.draftBody = r.body;
        lead.outreachStatus = 'drafted';
        lead.draftedAt = new Date().toISOString();
        success++;
      }
    }
    saveToDisk();
    console.log(`✅ Bulk generation done. ${success}/${eligible.length} emails generated`);
  })();
});

// POST /api/email/send/:leadId
router.post('/send/:leadId', async (req, res) => {
  const lead = leadsStore.find(l => l.id === req.params.leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (lead.website) return res.status(400).json({ error: 'Cannot send cold email to a lead who already has a website.' });

  const to      = req.body.toEmail  || lead.email;
  const subject = req.body.subject  || lead.draftSubject;
  const body    = req.body.body     || lead.draftBody;

  if (!to)             return res.status(400).json({ error: 'No recipient email.' });
  if (!subject || !body) return res.status(400).json({ error: 'No email draft. Generate email first.' });

  // Prevent duplicate sends
  const alreadySent = emailsStore.find(e => e.leadId === lead.id && e.status === 'sent');
  if (alreadySent && !req.body.force) {
    return res.status(409).json({ error: 'Email already sent to this lead. Pass force:true to resend.' });
  }

  console.log(`\n📤 Sending to: ${to} | ${lead.name}`);

  try {
    const result = await sendEmail({ to, subject, body });

    const emailLog = {
      id: `email_${Date.now()}`,
      leadId: lead.id,
      leadName: lead.name,
      to,
      subject,
      body,
      messageId: result.messageId,
      mock: result.mock,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
    emailsStore.push(emailLog);

    lead.outreachStatus = 'sent';
    lead.sentAt = new Date().toISOString();
    saveToDisk();

    console.log(`   ✅ Sent! MessageId: ${result.messageId}`);
    res.json({ success: true, mock: result.mock, emailLog });
  } catch (err) {
    console.error('Send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/send-bulk — send cold emails to all drafted leads
router.post('/send-bulk', async (req, res) => {
  const eligible = leadsStore.filter(
    l => l.emailStatus === 'found' && l.outreachStatus === 'drafted' && l.draftSubject && l.draftBody && !l.website
  );

  if (eligible.length === 0) {
    return res.json({ message: 'No drafted leads ready to send', count: 0 });
  }

  console.log(`\n📤 Bulk sending emails to ${eligible.length} leads...`);
  res.json({ message: `Sending emails to ${eligible.length} leads`, total: eligible.length });

  // Run in background sequentially to avoid spamming/throttling
  (async () => {
    let sent = 0;
    for (const lead of eligible) {
      try {
        const to = lead.email;
        const subject = lead.draftSubject;
        const body = lead.draftBody;

        // Skip if already sent
        const alreadySent = emailsStore.find(e => e.leadId === lead.id && e.status === 'sent');
        if (alreadySent) continue;

        const result = await sendEmail({ to, subject, body });

        const emailLog = {
          id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          leadId: lead.id,
          leadName: lead.name,
          to,
          subject,
          body,
          messageId: result.messageId,
          mock: result.mock,
          sentAt: new Date().toISOString(),
          status: 'sent',
        };
        emailsStore.push(emailLog);

        lead.outreachStatus = 'sent';
        lead.sentAt = new Date().toISOString();
        saveToDisk();

        sent++;
        console.log(`   ✅ Sent bulk email to: ${lead.name} (${to})`);
      } catch (err) {
        console.error(`   ❌ Failed sending bulk to ${lead.name}:`, err.message);
      }
      await sleep(1000); // polite 1 second delay between sends
    }
    console.log(`\n✅ Bulk sending done. Sent ${sent}/${eligible.length} emails`);
  })();
});

// GET /api/email/logs
router.get('/logs', (req, res) => {
  res.json({ total: emailsStore.length, emails: emailsStore });
});

// GET /api/email/verify
router.get('/verify', async (req, res) => {
  const result = await verifyEmailConfig();
  res.json(result);
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default router;
