const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'leads.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initDb();
  }
});

function initDb() {
  const sql = `
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstname TEXT NOT NULL,
      lastname TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      jobtitle TEXT NOT NULL,
      company TEXT NOT NULL,
      country TEXT NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.run(sql, (err) => {
    if (err) {
      console.error('Error initializing leads table:', err.message);
    } else {
      console.log('Leads table ready.');
    }
  });
}

function addLead(leadData) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO leads (firstname, lastname, email, phone, jobtitle, company, country, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      leadData.firstname,
      leadData.lastname,
      leadData.email,
      leadData.phone,
      leadData.jobtitle,
      leadData.company,
      leadData.country,
      leadData.message || ''
    ];
    db.run(sql, params, function (err) {
      if (err) {
        return reject(err);
      }
      resolve({ id: this.lastID, ...leadData });
    });
  });
}

function getLeads() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM leads ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

module.exports = {
  addLead,
  getLeads
};
