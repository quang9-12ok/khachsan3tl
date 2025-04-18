const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { verifyMailConnection, sendMailWithFallback } = require('../config/mailer');

// Hiển thị trang liên hệ
router.get('/', contactController.getContactPage);

// Xử lý gửi tin nhắn liên hệ
router.post('/send', contactController.sendContactMessage);

// Add a test route for email verification (only in development)
if (process.env.NODE_ENV === 'development') {
  router.get('/test-email', async (req, res) => {
    const result = await verifyMailConnection();
    res.json({
      success: result,
      message: result ? 'SMTP connection successful' : 'SMTP connection failed'
    });
  });
  
  // Add a comprehensive test route that tries to send an actual test email
  router.get('/test-send-email', async (req, res) => {
    try {
      // Create test email options
      const mailOptions = {
        from: `"Test Email" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, // Send to self for testing
        subject: 'Test Email from Khách sạn 3TL',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2>Test Email</h2>
            <p>This is a test email sent at: ${new Date().toLocaleString('vi-VN')}</p>
            <p>If you're seeing this, the email system is working correctly!</p>
          </div>
        `
      };
      
      // Try to send the email with fallback options
      const result = await sendMailWithFallback(mailOptions);
      
      // Return detailed response
      res.json({
        success: result.success,
        message: result.success 
          ? (result.savedToFile 
              ? `Email saved to file: ${result.filename}` 
              : (result.usedFallback 
                  ? 'Email sent using fallback transport' 
                  : 'Email sent successfully'))
          : 'Failed to send test email',
        details: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error in test email route',
        error: error.message
      });
    }
  });
  
  // Add a diagnostic route to check network connectivity
  router.get('/email-diagnostics', async (req, res) => {
    const diagnostics = {
      environment: process.env.NODE_ENV,
      smtpSettings: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER ? '✓ Configured' : '✗ Missing',
        pass: process.env.SMTP_PASS ? '✓ Configured' : '✗ Missing'
      },
      networkChecks: {}
    };
    
    // Check DNS resolution
    try {
      const dns = require('dns');
      const { promisify } = require('util');
      const lookup = promisify(dns.lookup);
      const resolve = promisify(dns.resolve);
      
      // Try to resolve the SMTP host
      const dnsResult = await lookup(process.env.SMTP_HOST || 'smtp.gmail.com');
      diagnostics.networkChecks.dnsLookup = {
        success: true,
        ip: dnsResult.address,
        family: `IPv${dnsResult.family}`
      };
      
      // Try to resolve MX records
      const mxRecords = await resolve('gmail.com', 'MX');
      diagnostics.networkChecks.mxRecords = {
        success: true,
        records: mxRecords.slice(0, 3) // Just show first 3 records
      };
    } catch (error) {
      diagnostics.networkChecks.dnsError = {
        message: error.message,
        code: error.code
      };
    }
    
    res.json(diagnostics);
  });
}

module.exports = router;