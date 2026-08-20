const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.warn("⚠️ Firebase Admin credentials are missing in .env. Initialization will likely fail.");
}

let db;

try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

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
