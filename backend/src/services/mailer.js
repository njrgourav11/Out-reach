import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendEmail({ to, subject, body, fromName }) {
  if (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'youremail@gmail.com') {
    console.log(`📧 [MOCK SEND] To: ${to} | Subject: ${subject}`);
    return { messageId: `mock_${Date.now()}`, mock: true };
  }

  const transporter = createTransporter();
  const name  = fromName || process.env.YOUR_NAME  || 'Gourav';
  const brand = process.env.YOUR_BRAND || 'Gourav.blog';

  const info = await transporter.sendMail({
    from: `"${name} @ ${brand}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: body,
    html: bodyToHtml(body, name, brand),
  });

  return { messageId: info.messageId, mock: false };
}

export async function verifyEmailConfig() {
  if (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'youremail@gmail.com') {
    return { valid: false, reason: 'No Gmail credentials configured' };
  }
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}

function bodyToHtml(body, name, brand) {
  const lines = body.split('\n').map(line =>
    line.trim() === '' ? '<br>' : `<p style="margin:0 0 8px 0;">${line}</p>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px 24px; line-height: 1.7;">
  ${lines}
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e5e5;">
  <p style="font-size: 12px; color: #888; margin: 0;">
    ${name} · <a href="${process.env.YOUR_PORTFOLIO || 'https://gourav.blog'}" style="color: #888;">${brand}</a>
    <br>You received this because we found your business online. Reply "unsubscribe" to opt out.
  </p>
</body>
</html>`;
}
