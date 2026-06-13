import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const YOUR_NAME      = process.env.YOUR_NAME      || 'Gourav';
const YOUR_BRAND     = process.env.YOUR_BRAND     || 'Gourav.blog';
const YOUR_PORTFOLIO = process.env.YOUR_PORTFOLIO || 'https://gourav.blog';
const YOUR_SERVICES  = process.env.YOUR_SERVICES  || 'website development, full stack development, app development';

export async function generateColdEmail(lead) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is missing in your backend/.env configuration.');
  }

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
6. Sign off as ${YOUR_NAME} from ${YOUR_BRAND} and include your portfolio link (${YOUR_PORTFOLIO}) in the signature so they can check out your work
7. Do NOT use buzzwords like "leverage", "synergy", "cutting-edge"
8. Sound human, not AI-generated

Respond ONLY in this exact JSON format (no extra text, no markdown):
{
  "subject": "email subject here",
  "body": "full email body here (plain text, with line breaks using \\n)"
}`;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await axios.post(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          model: 'minimaxai/minimax-m3',
          messages: [{ role: 'user', content: prompt }],
          temperature: 1.00,
          max_tokens: 8192,
          top_p: 0.95
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from NVIDIA AI');

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error(`Failed to parse response as JSON. Content: ${content}`);
        }
      }

      if (!parsed.subject || !parsed.body) {
        throw new Error('Invalid email format from NVIDIA AI (missing subject or body)');
      }

      return {
        subject: parsed.subject,
        body: parsed.body,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      attempt++;
      const status = err.response?.status;
      const isTransient = status === 502 || status === 503 || status === 504 || status === 429;
      
      if (attempt < maxRetries && (isTransient || !err.response)) {
        const delay = attempt * 1500;
        console.warn(`   ⚠️ Transient error ${status || 'network'}. Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`);
        await sleep(delay);
      } else {
        console.error('NVIDIA API Error:', err.response?.data || err.message);
        throw new Error(`NVIDIA AI Generation failed after ${attempt} attempts: ${err.response?.data?.detail || err.message}`);
      }
    }
  }
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
    await sleep(600); // rate limit buffer
  }
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
