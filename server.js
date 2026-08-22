require('dotenv').config();

// Prefer IPv4 for all outbound DNS. Container platforms often lack an
// IPv6 route while DNS still returns AAAA records first, which surfaces
// as ENETUNREACH on outbound connections (seen against smtp.gmail.com
// on Railway). Must run before any network client is constructed.
try {
  require('dns').setDefaultResultOrder('ipv4first');
} catch (e) {
  // Older Node versions do not expose this; safe to ignore.
}

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const db = require('./firebase');
const mailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the platform proxy so req.ip is the real client, not the
// load balancer. Required for per-IP rate limiting on Railway.
app.set('trust proxy', 1);

// Middleware
app.use(cors());
// 100kb (the default) is far more than this form needs and lets a
// single field carry ~99kb into Firestore.
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Serve static frontend files.
// HTML is revalidated every request so deploys are picked up
// immediately; fingerprint-free assets get a short cache with
// revalidation, images a long one.
app.use(express.static(__dirname, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (/\.html$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/\.(css|js)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    } else if (/\.(png|jpe?g|webp|svg|ico|mp4|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  }
}));

/* ═══════════════════════════════════════════════════════════════
   ADMIN AUTHENTICATION

   /api/leads returns every stored lead: names, business emails,
   phone numbers, job titles, companies and free-text messages.
   It previously had no authentication of any kind.

   Responds 404 rather than 401 on failure so the endpoint is not
   advertised to anyone probing for it. Uses a timing-safe compare
   so the key cannot be recovered byte-by-byte.
═══════════════════════════════════════════════════════════════ */
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    console.error('[SECURITY] /api/leads blocked: ADMIN_API_KEY is not set.');
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  const provided =
    req.get('x-admin-key') ||
    (req.get('authorization') || '').replace(/^Bearer\s+/i, '');

  if (!provided || !timingSafeEqual(provided, expected)) {
    console.warn('[SECURITY] Rejected /api/leads request from ' + req.ip);
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  return next();
}

/* ═══════════════════════════════════════════════════════════════
   RATE LIMITING

   Dependency-free fixed-window counter keyed by client IP.
   In-memory, so it is per-instance and resets on restart. That is
   sufficient for a single-instance deployment; a shared store
   would be needed if this scales horizontally.
═══════════════════════════════════════════════════════════════ */
function createRateLimiter({ windowMs, max, name }) {
  const hits = new Map();

  // Evict expired buckets so the map cannot grow without bound.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      console.warn('[RATE LIMIT] ' + name + ' blocked ' + key + ' (' + entry.count + ' in window)');
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again in a moment.'
      });
    }

    return next();
  };
}

// 10 per 10 min per IP: high enough that a genuine user correcting
// validation errors is never blocked, low enough that scripted
// submission is useless.
const contactLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10, name: 'contact' });
const adminLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 30, name: 'admin' });

/* ═══════════════════════════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════════════════════════ */
const FIELD_LIMITS = {
  firstname: 100,
  lastname: 100,
  email: 254,
  phone: 40,
  jobtitle: 150,
  company: 200,
  country: 100,
  message: 4000
};

const REQUIRED = ['firstname', 'lastname', 'email', 'phone', 'jobtitle', 'company', 'country'];

function validateLead(body) {
  const clean = {};

  for (const [field, maxLen] of Object.entries(FIELD_LIMITS)) {
    const raw = body[field];
    if (raw === undefined || raw === null) { clean[field] = ''; continue; }
    if (typeof raw !== 'string') {
      return { error: 'Please check your information and try again.' };
    }
    const trimmed = raw.trim();
    if (trimmed.length > maxLen) {
      return { error: 'One of the fields is too long. Please shorten it and try again.' };
    }
    clean[field] = trimmed;
  }

  for (const field of REQUIRED) {
    if (!clean[field]) {
      return { error: 'Please fill in all required fields marked with *.' };
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean.email)) {
    return { error: 'Please provide a valid business email address.' };
  }

  return { value: clean };
}

/* ═══════════════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════════════ */

// Health check now reflects real dependency state instead of
// always reporting ok while Firestore was unreachable.
app.get('/api/health', async (req, res) => {
  const mail = mailer.getMailerState();
  let datastore = 'ok';
  let datastoreError = null;

  try {
    await db.ping();
  } catch (error) {
    datastore = 'unavailable';
    datastoreError = db.getInitError() || error.message;
  }

  const healthy = datastore === 'ok';

  const payload = {
    status: healthy ? 'ok' : 'degraded',
    service: 'Opsib API',
    datastore,
    datastoreError,
    mail: {
      configured: mail.configured,
      verified: mail.verified,
      sender: mail.from,
      usingFallbackFrom: mail.usingFallbackFrom,
      recipient: mail.to,
      lastError: mail.lastError
    },
    timestamp: new Date().toISOString()
  };

  // Only when broken, and shape only: lengths and marker presence,
  // never key material. Makes a bad credential diagnosable without
  // shell access to the container.
  if (!healthy) {
    payload.credentialShape = db.getKeyShape();
    payload.projectId = process.env.FIREBASE_PROJECT_ID || null;
    payload.clientEmail = process.env.FIREBASE_CLIENT_EMAIL || null;
  }

  res.status(healthy ? 200 : 503).json(payload);
});

// Contact / Demo Request Form Submission Endpoint
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { error, value } = validateLead(req.body || {});
  if (error) {
    return res.status(400).json({ success: false, error });
  }

  if (!db.isReady()) {
    console.error('[API] /api/contact rejected: datastore unavailable.');
    return res.status(503).json({
      success: false,
      error: 'We are unable to receive your request right now. Please try again shortly.'
    });
  }

  try {
    // Idempotency: a double-click or client retry should not create
    // a second identical lead.
    // Fails OPEN by design — de-duplication is a convenience, and a
    // problem with this lookup must never cost us a real lead.
    let duplicate = null;
    try {
      duplicate = await db.findRecentLeadByEmail(value.email, 2 * 60 * 1000);
    } catch (dedupeError) {
      console.error('[API] Duplicate check skipped: ' + dedupeError.message);
    }

    if (duplicate) {
      console.log('[API] Duplicate submission suppressed for ' + value.email + ' (existing ' + duplicate.id + ')');
      return res.status(200).json({
        success: true,
        message: 'Thank you! Your inquiry has been received. Our enterprise team will be in touch shortly.',
        leadId: duplicate.id
      });
    }

    const newLead = await db.addLead(value);

    console.log('[LEAD RECEIVED] ' + newLead.id + ' - ' + value.firstname + ' ' + value.lastname +
                ' (' + value.company + ', ' + value.country + ') - ' + value.email);

    // Notification is intentionally out of band so a slow SMTP
    // server cannot delay the response, but the outcome is now
    // persisted onto the lead instead of vanishing into a log line.
    mailer.sendLeadNotification(newLead)
      .then((result) => db.markLeadNotified(newLead.id, result.ok, result.error))
      .catch((err) => db.markLeadNotified(newLead.id, false, err.message));

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your inquiry has been received. Our enterprise team will be in touch shortly.',
      leadId: newLead.id
    });
  } catch (error) {
    // Internal detail stays in the server log. Previously the raw
    // error.message was returned to the client.
    console.error('[API ERROR] /api/contact:', error);
    return res.status(500).json({
      success: false,
      error: 'Something went wrong on our side. Please try again shortly.'
    });
  }
});

// Admin / Lead Retrieval Endpoint — authentication required
app.get('/api/leads', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const leads = await db.getLeads(limit);
    return res.json({ success: true, count: leads.length, limit, leads });
  } catch (error) {
    console.error('[API ERROR] /api/leads:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve leads.' });
  }
});

// Unmatched non-API GETs fall back to the homepage.
// The previous pattern ('/{0,}') does not match anything in
// Express 5, so this fallback never actually ran.
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ═══════════════════════════════════════════════════════════════
   STARTUP
═══════════════════════════════════════════════════════════════ */
const server = app.listen(PORT, async () => {
  console.log('=================================================');
  console.log('  OPSIB Enterprise Server running on port ' + PORT);
  console.log('  Health Check : http://localhost:' + PORT + '/api/health');
  console.log('  Leads API    : http://localhost:' + PORT + '/api/leads  (x-admin-key required)');
  console.log('=================================================');

  if (!process.env.ADMIN_API_KEY) {
    console.error('[SECURITY] ADMIN_API_KEY is not set — /api/leads will return 404 for everyone.');
  }

  // Actually exercise the credential at boot. init succeeding only
  // proves the key parsed, not that it authenticates, so without this
  // a bad credential stays hidden until a real lead is lost.
  if (!db.isReady()) {
    console.error('[STARTUP] Firestore did not initialise. Submissions will be refused with 503.');
  } else {
    try {
      await db.ping();
      console.log('[STARTUP] Firestore credential verified — read succeeded.');
    } catch (error) {
      console.error('══════════════════════════════════════════════════════');
      console.error(' FIRESTORE CREDENTIAL REJECTED — leads CANNOT be saved');
      console.error(' ' + error.message);
      if (/UNAUTHENTICATED|invalid.*credential|invalid_grant/i.test(error.message)) {
        console.error('');
        console.error(' The key parsed but the service account did not');
        console.error(' authenticate. Re-copy FIREBASE_PRIVATE_KEY from the');
        console.error(' service-account JSON into this environment, or issue a');
        console.error(' new key in the Firebase console. Key shape seen here:');
        console.error(' ' + JSON.stringify(db.getKeyShape()));
      }
      console.error('══════════════════════════════════════════════════════');
    }
  }

  await mailer.verifyMailer();
});

/* ═══════════════════════════════════════════════════════════════
   LIFECYCLE

   Graceful shutdown so a deploy stops dropping in-flight
   submissions, and a hard exit on unknown faults so the platform
   restarts a clean process instead of keeping a corrupt one.
═══════════════════════════════════════════════════════════════ */
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('[LIFECYCLE] ' + signal + ' received — draining connections.');

  server.close(() => {
    console.log('[LIFECYCLE] HTTP server closed. Exiting.');
    process.exit(0);
  });

  // Do not hang forever if a socket refuses to close.
  setTimeout(() => {
    console.error('[LIFECYCLE] Drain timed out — forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Rejection:', reason);
});
