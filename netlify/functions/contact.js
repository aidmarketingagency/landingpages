/**
 * Netlify Function: contact
 * Route: POST /.netlify/functions/contact
 *
 * API proxy for the AIDHQ contact form.
 * Sends an email via SMTP (env vars only — no API keys client-side).
 *
 * Required environment variables (set in Netlify dashboard):
 *   SMTP_HOST      smtp.gmail.com
 *   SMTP_PORT      587
 *   SMTP_USER      ryan@aidmarketingagency.com
 *   SMTP_PASS      <app password>
 *   NOTIFY_EMAIL   ryan@aidmarketingagency.com
 */

const nodemailer = require('nodemailer');

// CORS headers — only allow our own domain
const ALLOWED_ORIGINS = [
  'https://aidmarketingagency.com',
  'https://www.aidmarketingagency.com',
  'http://localhost:3000',   // local dev
];

function getCORSHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

exports.handler = async (event) => {
  const origin = (event.headers && event.headers.origin) || '';
  const corsHeaders = getCORSHeaders(origin);

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed.' }),
    };
  }

  // Parse body
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid JSON body.' }),
    };
  }

  const { name, email, phone, business_type, message } = payload;

  // Server-side validation
  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Name is required.' }),
    };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Valid email is required.' }),
    };
  }
  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Message is required (min 5 characters).' }),
    };
  }

  // Sanitize inputs
  const safeName    = String(name).slice(0, 200).replace(/[<>]/g, '');
  const safeEmail   = String(email).slice(0, 320);
  const safePhone   = String(phone || '').slice(0, 30).replace(/[^0-9()\-+. ]/g, '');
  const safeBiz     = String(business_type || '').slice(0, 100).replace(/[<>]/g, '');
  const safeMessage = String(message).slice(0, 5000).replace(/[<>]/g, '');

  // Check required env vars
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_EMAIL) {
    console.error('[contact] Missing SMTP environment variables');
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Server configuration error. Please email ryan@aidmarketingagency.com directly.' }),
    };
  }

  // Build transporter
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: false,     // STARTTLS on 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  // Notification email to Ryan
  const notifyMail = {
    from: `"AIDHQ Contact Form" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL,
    replyTo: safeEmail,
    subject: `[AIDHQ Lead] ${safeName} — ${safeBiz || 'Unknown Business'}`,
    text: [
      'New contact form submission from aidmarketingagency.com',
      '',
      `Name:          ${safeName}`,
      `Email:         ${safeEmail}`,
      `Phone:         ${safePhone || 'Not provided'}`,
      `Business Type: ${safeBiz   || 'Not provided'}`,
      '',
      'Message:',
      safeMessage,
      '',
      `Submitted: ${timestamp} ET`,
    ].join('\n'),
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:580px;margin:0 auto;background:#0D0D0F;color:#F0EDE8;border-radius:10px;overflow:hidden;">
        <div style="background:#1E1E22;padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="font-family:monospace;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#C9A84C;margin:0 0 8px;">AIDHQ // New Lead</p>
          <h2 style="font-size:22px;font-weight:800;margin:0;color:#F0EDE8;">${safeName}</h2>
          <p style="margin:4px 0 0;font-size:14px;color:#888580;">${safeBiz || 'Business type not specified'}</p>
        </div>
        <div style="padding:24px 28px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#888580;width:130px;">Email</td><td style="color:#F0EDE8;"><a href="mailto:${safeEmail}" style="color:#C9A84C;">${safeEmail}</a></td></tr>
            <tr><td style="padding:6px 0;color:#888580;">Phone</td><td style="color:#F0EDE8;">${safePhone || 'Not provided'}</td></tr>
            <tr><td style="padding:6px 0;color:#888580;">Business</td><td style="color:#F0EDE8;">${safeBiz || 'Not provided'}</td></tr>
          </table>
          <div style="margin-top:20px;padding:16px;background:#1E1E22;border-radius:8px;border-left:3px solid #C9A84C;">
            <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#888580;margin:0 0 8px;font-family:monospace;">Message</p>
            <p style="font-size:15px;color:#F0EDE8;line-height:1.7;margin:0;">${safeMessage.replace(/\n/g, '<br>')}</p>
          </div>
        </div>
        <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:right;">
          <p style="font-size:12px;color:#888580;margin:0;">Submitted ${timestamp} ET via aidmarketingagency.com</p>
        </div>
      </div>
    `,
  };

  // Auto-reply to sender
  const autoReply = {
    from: `"Ryan McNally — AIDHQ" <${SMTP_USER}>`,
    to: safeEmail,
    subject: 'Got your message — Ryan McNally (AIDHQ)',
    text: [
      `Hi ${safeName},`,
      '',
      "Thanks for reaching out. I got your message and I'll be in touch within 24 hours.",
      '',
      "In the meantime, if you want to learn more about what we build for contractors and property managers, check out:",
      '→ Condition Docs AI: https://condition-docs-ai.netlify.app (free trial, no card required)',
      '',
      'Talk soon,',
      'Ryan McNally',
      'AIDHQ / AID Marketing Agency',
      'ryan@aidmarketingagency.com',
      '(856) 340-8990',
    ].join('\n'),
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D0D0F;color:#F0EDE8;border-radius:10px;overflow:hidden;">
        <div style="background:#1E1E22;padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="font-family:monospace;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#C9A84C;margin:0 0 8px;">AIDHQ</p>
          <h2 style="font-size:20px;font-weight:800;margin:0;color:#F0EDE8;">Got your message, ${safeName}.</h2>
        </div>
        <div style="padding:24px 28px;">
          <p style="font-size:15px;color:#F0EDE8;line-height:1.75;margin-bottom:16px;">I'll be in touch within 24 hours.</p>
          <p style="font-size:14px;color:#888580;line-height:1.7;margin-bottom:20px;">
            While you wait, check out <a href="https://condition-docs-ai.netlify.app" style="color:#C9A84C;">Condition Docs AI</a>
            — free trial, no card required. It turns 45-minute move-out inspections into 90-second AI reports.
          </p>
          <p style="font-size:14px;color:#888580;line-height:1.7;">
            Ryan McNally<br>
            AIDHQ / AID Marketing Agency<br>
            <a href="mailto:ryan@aidmarketingagency.com" style="color:#C9A84C;">ryan@aidmarketingagency.com</a><br>
            (856) 340-8990
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(notifyMail);
    await transporter.sendMail(autoReply);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Message sent successfully.' }),
    };
  } catch (err) {
    console.error('[contact] SMTP error:', err.message);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to send email. Please try emailing ryan@aidmarketingagency.com directly.' }),
    };
  }
};
