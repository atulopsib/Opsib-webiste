require('dotenv').config();
const nodemailer = require('nodemailer');

/* ═══════════════════════════════════════════════════════════════
   OPSIB — Lead notification mailer

   Design notes:
   · Every interpolated value is HTML-escaped. Lead fields are
     attacker-controlled, and this email is rendered in YOUR inbox.
   · The From address must match the authenticated SMTP user or
     Gmail rewrites it and the receiving side may fail SPF/DMARC.
   · Misconfiguration is reported loudly at boot via verifyMailer()
     instead of failing silently on the first real lead.
═══════════════════════════════════════════════════════════════ */

let cachedTransporter;
let transporterBuilt = false;

const mailerState = {
  configured: false,
  verified: false,
  lastError: null,
  from: null,
  to: null
};

/** Escape untrusted text for safe interpolation into HTML. */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape, then convert newlines to <br> for multi-line fields. */
function escapeMultiline(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function extractAddress(value) {
  if (!value) return null;
  const angled = value.match(/<([^>]+)>/);
  return (angled ? angled[1] : value).trim().toLowerCase();
}

/**
 * Resolve the From header.
 *
 * Gmail only permits sending as the authenticated account or one of
 * its verified aliases. SMTP_FROM previously declared
 * notifications@opsib.ai while authenticating as atul@opsib.com,
 * so Gmail rewrote the envelope and the message could fail SPF or
 * DMARC for opsib.ai and be filtered as spam at the receiving end.
 */
function resolveFrom(user) {
  const configured = process.env.SMTP_FROM;
  const configuredAddr = extractAddress(configured);
  const authAddr = (user || '').trim().toLowerCase();

  if (!configured) return '"Opsib Leads" <' + user + '>';
  if (configuredAddr === authAddr) return configured;

  // Preserve the intended display name, correct the address.
  const nameMatch = configured.match(/^\s*"?([^"<]*?)"?\s*</);
  const displayName = (nameMatch && nameMatch[1].trim()) || 'Opsib Leads';

  console.warn(
    '[MAILER] SMTP_FROM address (' + configuredAddr + ') does not match ' +
    'SMTP_USER (' + authAddr + '). Gmail will not send as an unverified ' +
    'address. Falling back to "' + displayName + '" <' + user + '>. ' +
    'To send as ' + configuredAddr + ', add it as a verified alias in the ' +
    'Gmail account, or set SMTP_FROM to the authenticated address.'
  );

  return '"' + displayName.replace(/"/g, '') + '" <' + user + '>';
}

function getTransporter() {
  if (transporterBuilt) return cachedTransporter;
  transporterBuilt = true;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;

  // App passwords are displayed in 4-character groups; a pasted
  // value often carries those spaces.
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (!user || !pass || pass === 'your-app-password-here') {
    mailerState.configured = false;
    mailerState.lastError =
      'SMTP_USER and/or SMTP_PASS are not set in this environment. ' +
      'Lead notification emails are DISABLED. Note that .env is ' +
      'gitignored, so these must be configured separately on the host.';
    cachedTransporter = null;
    return null;
  }

  mailerState.configured = true;
  mailerState.from = resolveFrom(user);
  mailerState.to = process.env.NOTIFICATION_EMAIL || user;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
    // TLS certificate validation is left ON. It was previously
    // disabled via rejectUnauthorized:false, which accepts any
    // certificate and exposes the SMTP credentials to interception.
  });

  return cachedTransporter;
}

/**
 * Probe SMTP at startup so a broken mail setup is obvious in the
 * boot logs rather than discovered by a lost lead.
 */
async function verifyMailer() {
  const transporter = getTransporter();

  if (!transporter) {
    console.error('══════════════════════════════════════════════════════');
    console.error(' MAIL DISABLED — ' + mailerState.lastError);
    console.error('══════════════════════════════════════════════════════');
    return false;
  }

  try {
    await transporter.verify();
    mailerState.verified = true;
    mailerState.lastError = null;
    console.log('[MAILER] SMTP verified. Notifications: ' + mailerState.from + ' -> ' + mailerState.to);
    return true;
  } catch (error) {
    mailerState.verified = false;
    mailerState.lastError = error.message;
    console.error('══════════════════════════════════════════════════════');
    console.error(' MAIL VERIFY FAILED — notifications will likely fail');
    console.error(' ' + error.message);
    console.error('══════════════════════════════════════════════════════');
    return false;
  }
}

function buildHtml(lead) {
  const row = (label, value) =>
    '<tr><td class="label">' + escapeHtml(label) + '</td>' +
    '<td class="value">' + value + '</td></tr>';

  const email = escapeHtml(lead.email);

  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8"><style>',
    'body{font-family:Segoe UI,Arial,sans-serif;background:#f4f6f9;color:#1a1a1a;margin:0;padding:20px}',
    '.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden}',
    '.header{background:#04060f;color:#fff;padding:24px 32px}',
    '.header h1{margin:0;font-size:20px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}',
    '.header p{margin:4px 0 0;font-size:12px;color:#94a3b8}',
    '.content{padding:32px}',
    '.badge{display:inline-block;background:#e0f2fe;color:#0369a1;font-weight:600;font-size:11px;padding:4px 10px;border-radius:4px;text-transform:uppercase;margin-bottom:20px}',
    '.table{width:100%;border-collapse:collapse;margin-bottom:24px}',
    '.table td{padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px}',
    '.table td.label{font-weight:600;color:#64748b;width:140px;text-transform:uppercase;font-size:11px;letter-spacing:.05em}',
    '.table td.value{color:#0f172a;font-weight:500}',
    '.message-box{background:#f8fafc;border-left:4px solid #0f172a;padding:16px;margin-top:16px;border-radius:0 4px 4px 0;font-size:14px;line-height:1.6;color:#334155}',
    '.footer{background:#f8fafc;padding:16px 32px;font-size:11px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0}',
    '</style></head><body><div class="container">',
    '<div class="header"><h1>Opsib Platform</h1><p>New Enterprise Inquiry / Lead Notification</p></div>',
    '<div class="content">',
    '<span class="badge">New Inbound Lead ' + escapeHtml(lead.id || '') + '</span>',
    '<table class="table">',
    row('Full Name', '<strong>' + escapeHtml(lead.firstname) + ' ' + escapeHtml(lead.lastname) + '</strong>'),
    row('Business Email', '<a href="mailto:' + encodeURIComponent(lead.email || '') + '" style="color:#0284c7;text-decoration:none">' + email + '</a>'),
    row('Phone Number', escapeHtml(lead.phone)),
    row('Job Title', escapeHtml(lead.jobtitle)),
    row('Company', escapeHtml(lead.company)),
    row('Country', escapeHtml(lead.country)),
    '</table>',
    '<div style="font-weight:600;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Project Context / Message:</div>',
    '<div class="message-box">' + (lead.message ? escapeMultiline(lead.message) : '<em>No message provided.</em>') + '</div>',
    '</div>',
    '<div class="footer">This notification was automatically sent from the Opsib Retail Operations Intelligence system.</div>',
    '</div></body></html>'
  ].join('');
}

function buildText(lead) {
  return [
    'New inbound lead ' + (lead.id || ''),
    '',
    'Name    : ' + (lead.firstname || '') + ' ' + (lead.lastname || ''),
    'Email   : ' + (lead.email || ''),
    'Phone   : ' + (lead.phone || ''),
    'Title   : ' + (lead.jobtitle || ''),
    'Company : ' + (lead.company || ''),
    'Country : ' + (lead.country || ''),
    '',
    'Message :',
    lead.message || '(none)'
  ].join('\n');
}

/**
 * Send the lead notification.
 * Resolves to { ok, messageId?, error? } and never throws, so the
 * caller can record the outcome without risking an unhandled
 * rejection.
 */
async function sendLeadNotification(lead) {
  const transporter = getTransporter();

  if (!transporter) {
    console.error('[MAILER] Lead ' + (lead && lead.id) + ' saved but NOT emailed: ' + mailerState.lastError);
    return { ok: false, error: mailerState.lastError };
  }

  try {
    const info = await transporter.sendMail({
      from: mailerState.from,
      to: mailerState.to,
      // Replying to the notification reaches the prospect directly.
      replyTo: lead.email ? '"' + String(lead.firstname || '').replace(/"/g, '') + ' ' + String(lead.lastname || '').replace(/"/g, '') + '" <' + lead.email + '>' : undefined,
      subject: '[Opsib Lead] ' + (lead.company || 'Unknown') + ' - ' + (lead.firstname || '') + ' ' + (lead.lastname || '') + ' (' + (lead.country || '') + ')',
      text: buildText(lead),
      html: buildHtml(lead)
    });

    if (info.rejected && info.rejected.length) {
      const err = 'Recipient rejected: ' + info.rejected.join(', ');
      console.error('[MAILER] ' + err);
      return { ok: false, error: err };
    }

    console.log('[MAILER] Lead ' + lead.id + ' notified -> ' + mailerState.to + ' (id ' + info.messageId + ')');
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    console.error('[MAILER] Lead ' + (lead && lead.id) + ' saved but email FAILED: ' + error.message);
    return { ok: false, error: error.message };
  }
}

function getMailerState() {
  return {
    configured: mailerState.configured,
    verified: mailerState.verified,
    from: mailerState.from,
    to: mailerState.to,
    lastError: mailerState.lastError
  };
}

module.exports = {
  sendLeadNotification,
  verifyMailer,
  getMailerState,
  escapeHtml
};
