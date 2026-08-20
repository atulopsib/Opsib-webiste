const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.warn("⚠️ Firebase Admin credentials are missing in .env. Initialization will likely fail.");
}

let db;

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
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

/**
 * Adds a new lead to the Firestore database
 * @param {Object} leadData - The lead information
 * @returns {Promise<Object>} - The saved document reference and ID
 */
async function addLead(leadData) {
  const newLead = {
    ...leadData,
    createdAt: FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('leads').add(newLead);
  return { id: docRef.id, ...newLead };
}

/**
 * Retrieves all leads from Firestore, ordered by creation date
 * @returns {Promise<Array>} - Array of lead objects
 */
async function getLeads() {
  const snapshot = await db.collection('leads').orderBy('createdAt', 'desc').get();
  
  const leads = [];
  snapshot.forEach(doc => {
    leads.push({ id: doc.id, ...doc.data() });
  });
  
  return leads;
}

module.exports = {
  db,
  addLead,
  getLeads
};
