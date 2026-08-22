const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.warn("⚠️ Firebase Admin credentials are missing in .env. Initialization will likely fail.");
}

let db;
let initError = 'Firebase Admin SDK has not completed initialization.';

try {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    // Strip accidental surrounding quotes
    privateKey = privateKey.replace(/^"|"$/g, '');
    // Convert literal "\n" strings to actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // If the key is totally flat (no newlines), reconstruct the PEM format
    if (!privateKey.includes('\n')) {
      privateKey = privateKey.replace(/(-----BEGIN PRIVATE KEY-----)\s*/, '$1\n');
      privateKey = privateKey.replace(/\s*(-----END PRIVATE KEY-----)/, '\n$1');
      const startIdx = privateKey.indexOf('\n') + 1;
      const endIdx = privateKey.lastIndexOf('\n');
      if (startIdx > 0 && endIdx > startIdx) {
        let body = privateKey.substring(startIdx, endIdx);
        body = body.replace(/\s+/g, '\n'); // Convert spaces in base64 to newlines
        privateKey = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
      }
    }
  }
  
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    })
  });

  db = getFirestore();
  initError = null;
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  initError = error.message;
  console.error("══════════════════════════════════════════════════════");
  console.error(" FIRESTORE INIT FAILED — leads CANNOT be saved");
  console.error(" " + error.message);
  console.error("══════════════════════════════════════════════════════");
}

/** True when Firestore is usable. Previously the server booted and
 *  reported healthy with db undefined, silently losing every lead. */
function isReady() {
  return Boolean(db);
}

function getInitError() {
  return initError;
}

/**
 * Adds a new lead to the Firestore database
 * @param {Object} leadData - The lead information
 * @returns {Promise<Object>} - The saved document reference and ID
 */
async function addLead(leadData) {
  if (!db) throw new Error('DATASTORE_UNAVAILABLE');

  const newLead = {
    ...leadData,
    // Notification state starts pending so a lead that never got
    // emailed is identifiable rather than indistinguishable.
    notification: { status: 'pending', attemptedAt: null, error: null },
    createdAt: FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('leads').add(newLead);
  return { id: docRef.id, ...newLead };
}

/**
 * Record whether the notification email actually went out.
 * Never throws: this runs on a background path and must not take
 * down the request that scheduled it.
 */
async function markLeadNotified(leadId, ok, error) {
  if (!db || !leadId) return;
  try {
    await db.collection('leads').doc(leadId).update({
      notification: {
        status: ok ? 'sent' : 'failed',
        attemptedAt: FieldValue.serverTimestamp(),
        error: ok ? null : String(error || 'unknown').slice(0, 500)
      }
    });
  } catch (err) {
    console.error('[FIRESTORE] Could not record notification state for ' + leadId + ': ' + err.message);
  }
}

/**
 * Recent lead by the same email, used for submit de-duplication.
 *
 * Deliberately an equality-only query. Adding .orderBy('createdAt')
 * turns this into a composite query, which Firestore refuses with
 * FAILED_PRECONDITION until a composite index is built by hand.
 * Equality filters are served by the automatic single-field index,
 * so this needs no index configuration. The window comparison is
 * done in memory over a handful of documents.
 */
async function findRecentLeadByEmail(email, windowMs) {
  if (!db || !email) return null;

  const snap = await db.collection('leads')
    .where('email', '==', email)
    .limit(10)
    .get();

  if (snap.empty) return null;

  const cutoff = Date.now() - windowMs;
  let newest = null;

  snap.forEach((doc) => {
    const data = doc.data();
    const created = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().getTime() : 0;
    if (created > cutoff && (!newest || created > newest.created)) {
      newest = { created, lead: { id: doc.id, ...data } };
    }
  });

  return newest ? newest.lead : null;
}

/**
 * Retrieves all leads from Firestore, ordered by creation date
 * @returns {Promise<Array>} - Array of lead objects
 */
async function getLeads(limit) {
  if (!db) throw new Error('DATASTORE_UNAVAILABLE');

  let query = db.collection('leads').orderBy('createdAt', 'desc');
  if (limit && Number.isFinite(limit)) query = query.limit(limit);

  const snapshot = await query.get();

  const leads = [];
  snapshot.forEach(doc => {
    leads.push({ id: doc.id, ...doc.data() });
  });

  return leads;
}

/** Lightweight round-trip so /api/health reflects real reachability. */
async function ping() {
  if (!db) throw new Error('DATASTORE_UNAVAILABLE');
  await db.collection('leads').limit(1).get();
  return true;
}

module.exports = {
  db,
  addLead,
  getLeads,
  isReady,
  getInitError,
  markLeadNotified,
  findRecentLeadByEmail,
  ping
};
