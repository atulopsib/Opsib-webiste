require('dotenv').config();
const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || pass === 'your-app-password-here') {
    return null; // SMTP credentials pending in .env
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

async function sendLeadNotification(leadData) {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('⚠️ [MAILER] Email notification skipped: Please configure SMTP_USER and SMTP_PASS in .env file.');
      return false;
    }

    const recipient = process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;
    const sender = process.env.SMTP_FROM || `"Opsib Leads" <${process.env.SMTP_USER}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; color: #1a1a1a; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #04060f; color: #ffffff; padding: 24px 32px; border-bottom: 2px solid #334155; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
          .header p { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
          .content { padding: 32px; }
          .badge { display: inline-block; background: #e0f2fe; color: #0369a1; font-weight: 600; font-size: 11px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 20px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .table td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .table td.label { font-weight: 600; color: #64748b; width: 140px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          .table td.value { color: #0f172a; font-weight: 500; }
          .message-box { background: #f8fafc; border-left: 4px solid #0f172a; padding: 16px; margin-top: 16px; border-radius: 0 4px 4px 0; font-size: 14px; line-height: 1.6; color: #334155; }
          .footer { background: #f8fafc; padding: 16px 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Opsib Platform</h1>
            <p>New Enterprise Inquiry / Lead Notification</p>
          </div>
          <div class="content">
            <span class="badge">New Inbound Lead #${leadData.id || ''}</span>
            <table class="table">
              <tr>
                <td class="label">Full Name</td>
                <td class="value"><strong>${leadData.firstname} ${leadData.lastname}</strong></td>
              </tr>
              <tr>
                <td class="label">Business Email</td>
                <td class="value"><a href="mailto:${leadData.email}" style="color:#0284c7; text-decoration:none;">${leadData.email}</a></td>
              </tr>
              <tr>
                <td class="label">Phone Number</td>
                <td class="value">${leadData.phone}</td>
              </tr>
              <tr>
                <td class="label">Job Title</td>
                <td class="value">${leadData.jobtitle}</td>
              </tr>
              <tr>
                <td class="label">Company</td>
                <td class="value">${leadData.company}</td>
              </tr>
              <tr>
                <td class="label">Country</td>
                <td class="value">${leadData.country}</td>
              </tr>
            </table>

            <div style="font-weight: 600; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Project Context / Message:</div>
            <div class="message-box">
              ${leadData.message ? leadData.message.replace(/\n/g, '<br>') : '<em>No message provided.</em>'}
            </div>
          </div>
          <div class="footer">
            This notification was automatically sent from the Opsib Retail Operations Intelligence system.
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: sender,
      to: recipient,
      subject: `[Opsib Lead] ${leadData.company} - ${leadData.firstname} ${leadData.lastname} (${leadData.country})`,
      html: htmlContent
    });

    console.log(`[MAILER SUCCESS] Email notification sent to ${recipient} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('⚠️ [MAILER ERROR] Failed to send lead notification email:', error.message);
    return false;
  }
}

module.exports = {
  sendLeadNotification
};
