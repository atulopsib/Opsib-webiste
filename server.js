const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const mailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(__dirname));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Opsib API', timestamp: new Date().toISOString() });
});

// Contact / Demo Request Form Submission Endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { firstname, lastname, email, phone, jobtitle, company, country, message } = req.body;

    // Field validation
    if (!firstname || !lastname || !email || !phone || !jobtitle || !company || !country) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields marked with *.'
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid business email address.'
      });
    }

    // Save lead to SQLite database
    const newLead = await db.addLead({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: email.trim(),
      phone: phone.trim(),
      jobtitle: jobtitle.trim(),
      company: company.trim(),
      country: country.trim(),
      message: message ? message.trim() : ''
    });

    console.log(`[LEAD RECEIVED] #${newLead.id} - ${firstname} ${lastname} (${company}, ${country}) - ${email}`);

    // Trigger async email notification (non-blocking for UI)
    mailer.sendLeadNotification(newLead).catch((err) => {
      console.error('[MAILER ASYNC ERROR]', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your inquiry has been received. Our enterprise team will be in touch shortly.',
      leadId: newLead.id
    });
  } catch (error) {
    console.error('[API ERROR] /api/contact:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing your request. Please try again.'
    });
  }
});

// Admin / Lead Retrieval Endpoint
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await db.getLeads();
    return res.json({ success: true, count: leads.length, leads });
  } catch (error) {
    console.error('[API ERROR] /api/leads:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve leads.' });
  }
});

// Fallback to index.html for non-API client routes
app.get('/{0,}', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  OPSIB Enterprise Server running on port ${PORT}`);
  console.log(`  Health Check : http://localhost:${PORT}/api/health`);
  console.log(`  Leads API    : http://localhost:${PORT}/api/leads`);
  console.log(`=================================================`);
});
