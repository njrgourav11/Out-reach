import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const YOUR_NAME      = process.env.YOUR_NAME      || 'Sandy';
const YOUR_BRAND     = process.env.YOUR_BRAND     || 'Sandysource';
const YOUR_PORTFOLIO = process.env.YOUR_PORTFOLIO || 'https://sandysource.vercel.app';
const YOUR_SERVICES  = process.env.YOUR_SERVICES  || 'website development and web apps';

export async function generateColdEmail(lead) {
  const prompt = `You are ${YOUR_NAME}, a freelance web developer from ${YOUR_BRAND}.
Your portfolio: ${YOUR_PORTFOLIO}
Your services: ${YOUR_SERVICES}

Write a SHORT, friendly, personalized cold email to this US business:
- Business Name: ${lead.name}
- Business Type: ${lead.businessType}
- City: ${lead.city}
- Website: ${lead.website || 'none (they may not have one yet)'}

Email rules:
1. Subject line must be catchy and specific to their business type
2. Keep it under 120 words total
3. Open with ONE specific observation about their niche or location
4. Offer ONE clear value: modern website, faster loading, mobile-friendly redesign, or online booking
5. Include a soft CTA (just ask for a quick 15-min chat)
6. Sign off as ${YOUR_NAME} from ${YOUR_BRAND}
7. Do NOT use buzzwords like "leverage", "synergy", "cutting-edge"
8. Sound human, not AI-generated

Respond ONLY in this exact JSON format (no extra text, no markdown):
{
  "subject": "email subject here",
  "body": "full email body here (plain text, with line breaks using \\n)"
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq');

  const parsed = JSON.parse(content);
  if (!parsed.subject || !parsed.body) throw new Error('Invalid email format from Groq');

  return {
    subject: parsed.subject,
    body: parsed.body,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateBulkEmails(leads) {
  const results = [];
  for (const lead of leads) {
    try {
      const email = await generateColdEmail(lead);
      results.push({ leadId: lead.id, success: true, ...email });
    } catch (err) {
      results.push({ leadId: lead.id, success: false, error: err.message });
    }
    await sleep(600); // Groq rate limit buffer
  }
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
