const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.warn("⚠️ Firebase Admin credentials are missing in .env. Initialization will likely fail.");
}

let db;
let initError = 'Firebase Admin SDK has not completed initialization.';

/**
 * Repair a truncated service-account email.
 *
 * Observed in production: FIREBASE_CLIENT_EMAIL ended
 * "...iam.gserviceaccount" with the ".com" missing. The JWT is then
 * signed for a principal that does not exist and every request fails
 * with "16 UNAUTHENTICATED", which reads like a bad key rather than a
 * bad identity.
 *
 * Every Google service-account address ends in
 * ".gserviceaccount.com", so completing that suffix is deterministic
 * rather than a guess.
 */
function normalizeClientEmail(raw) {
  if (!raw) return raw;

  let email = String(raw).trim().replace(/,\s*$/, '');
  if ((email.startsWith('"') && email.endsWith('"')) ||
      (email.startsWith("'") && email.endsWith("'"))) {
    email = email.slice(1, -1);
  }

  if (/\.gserviceaccount$/i.test(email)) {
    console.warn('[FIRESTORE] FIREBASE_CLIENT_EMAIL was truncated ("' + email +
                 '"); completing it to "' + email + '.com". Fix the variable ' +
                 'in the environment so this repair is not needed.');
    email += '.com';
  } else if (/\.gserviceaccount\.co$/i.test(email)) {
    console.warn('[FIRESTORE] FIREBASE_CLIENT_EMAIL was truncated ("' + email +
                 '"); completing the .com suffix.');
    email += 'm';
  }

  return email;
}

/**
 * Normalise a service-account private key across the many shapes it
 * arrives in. A .env file, a Railway variable pasted from the JSON
 * key file, and a value pasted with real newlines are all different,
 * and a subtly wrong key still parses as valid PEM — it then fails
 * at RPC time with "16 UNAUTHENTICATED" rather than at init, which
 * makes the cause hard to see.
 */
function normalizePrivateKey(raw) {
  if (!raw) return raw;

  let key = String(raw).trim();

  // Trailing comma left behind when copying a line out of JSON.
  key = key.replace(/,\s*$/, '');

  // Matching surrounding quotes, single or double.
  if ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // Escaped newline sequences -> real newlines.
  key = key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');

  // Normalise real CRLF.
  key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const hasBegin = key.includes('-----BEGIN PRIVATE KEY-----');
  const hasEnd = key.includes('-----END PRIVATE KEY-----');

  // Reconstruct the PEM envelope when it is flat, or when the base64
  // body survived but the header/footer lines did not.
  //
  // Observed in production: a value carrying the full 1624-character
  // body across 26 lines with both markers stripped. Some dashboards
  // drop the ----- lines when a multi-line value is pasted. The body
  // is intact, so re-wrapping it is a deterministic repair rather
  // than a guess.
  if (!key.includes('\n') || !hasBegin || !hasEnd) {
    const body = key
      .replace(/-+BEGIN[A-Z ]*PRIVATE KEY-+/g, '')
      .replace(/-+END[A-Z ]*PRIVATE KEY-+/g, '')
      .replace(/\s+/g, '');

    // Only rebuild when the remainder really is a plausible key body.
    // Refusing to guess on junk keeps the failure honest.
    if (/^[A-Za-z0-9+/=]+$/.test(body) && body.length >= 1000) {
      const wrapped = body.match(/.{1,64}/g);
      key = '-----BEGIN PRIVATE KEY-----\n' + wrapped.join('\n') + '\n-----END PRIVATE KEY-----\n';
      if (!hasBegin || !hasEnd) {
        console.warn('[FIRESTORE] FIREBASE_PRIVATE_KEY was missing its PEM ' +
                     'header/footer lines; rebuilt them around the ' + body.length +
                     '-character body. Set the full key including the ' +
                     '-----BEGIN/END PRIVATE KEY----- lines to avoid relying on this.');
      }
    }
  }

  if (!key.endsWith('\n')) key += '\n';
  return key;
}

/** Shape only — no key material. Safe to log. */
function describeKey(key) {
  const k = key || '';
  const body = k
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  return {
    length: k.length,
    hasBeginMarker: /-----BEGIN PRIVATE KEY-----/.test(k),
    hasEndMarker: /-----END PRIVATE KEY-----/.test(k),
    lineCount: k.split('\n').filter(Boolean).length,
    bodyChars: body.length,
    bodyIsBase64: /^[A-Za-z0-9+/=]*$/.test(body)
  };
}

let keyShape = null;
let resolvedIdentity = { projectId: null, clientEmail: null };

try {
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  keyShape = describeKey(privateKey);

  // A well-formed PKCS#8 RSA 2048 key has a body around 1600-1700
  // base64 characters. Anything far short of that is truncated.
  if (!keyShape.hasBeginMarker || !keyShape.hasEndMarker || !keyShape.bodyIsBase64 || keyShape.bodyChars < 1000) {
    console.error('[FIRESTORE] FIREBASE_PRIVATE_KEY looks malformed: ' + JSON.stringify(keyShape));
  }
  
  const clientEmail = normalizeClientEmail(process.env.FIREBASE_CLIENT_EMAIL);
  const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim().replace(/,\s*$/, '');

  resolvedIdentity = { projectId, clientEmail };

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey,
    })
  });

  db = getFirestore();
  initError = null;
  console.log('Firebase Admin SDK initialized. project=' + projectId +
              ' clientEmail=' + clientEmail +
              ' keyShape=' + JSON.stringify(keyShape));
  console.log('[FIRESTORE] Note: successful init does NOT prove the credential works. ' +
              'A wrong-but-well-formed key fails later with "16 UNAUTHENTICATED".');
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

/** Shape of the configured key. Contains no key material. */
function getKeyShape() {
  return keyShape;
}

/** Identity actually handed to the SDK, after normalisation. */
function getResolvedIdentity() {
  return resolvedIdentity;
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
  getKeyShape,
  getResolvedIdentity,
  markLeadNotified,
  findRecentLeadByEmail,
  ping
};
