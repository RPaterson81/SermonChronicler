const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendProcessingComplete(email, sermonData, downloadLinks) {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@sermonchronicler.com',
      to: email,
      subject: `Study Materials Ready: ${sermonData.title}`,
      html: this.generateCompleteEmail(sermonData, downloadLinks)
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Completion email sent to ${email}`);
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendSubscriptionConfirmation(email, channelData) {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@sermonchronicler.com',
      to: email,
      subject: `Subscription Confirmed: ${channelData.name}`,
      html: this.generateSubscriptionEmail(channelData)
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Subscription confirmation sent to ${email}`);
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  generateCompleteEmail(sermonData, downloadLinks) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6; 
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white;
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content { 
            padding: 40px 30px; 
          }
          .sermon-title {
            font-size: 24px;
            font-weight: 600;
            color: #2d3748;
            margin: 0 0 20px 0;
          }
          .intro-text {
            color: #4a5568;
            margin-bottom: 30px;
          }
          .download-section {
            background: #f7fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
          }
          .download-button { 
            display: inline-block; 
            background: #667eea; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 8px 8px 8px 0;
            font-weight: 500;
          }
          .download-button:hover {
            background: #5568d3;
          }
          .materials-list {
            margin: 20px 0;
            padding-left: 20px;
          }
          .materials-list li {
            margin: 8px 0;
            color: #4a5568;
          }
          .footer { 
            padding: 30px; 
            text-align: center; 
            color: #718096; 
            font-size: 14px;
            background-color: #f7fafc;
          }
          .footer-tagline {
            margin: 5px 0;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📖 Your Study Materials Are Ready!</h1>
          </div>
          <div class="content">
            <h2 class="sermon-title">${sermonData.title}</h2>
            <p class="intro-text">Your study materials have been generated and are ready to download. Click the links below to access each document:</p>
            
            <div class="download-section">
              ${downloadLinks.map(link => `
                <a href="${link.url}" class="download-button">${link.name}</a>
              `).join('')}
            </div>

            <p><strong>What's included:</strong></p>
            <ul class="materials-list">
              <li><strong>Clean Transcript</strong> - Polished, readable version of the sermon</li>
              <li><strong>Sermon Notes</strong> - Structured outline with key points</li>
              <li><strong>Keyword Study</strong> - Biblical word studies and references</li>
              <li><strong>Life Group Leaders Guide</strong> - Discussion questions and teaching notes</li>
              <li><strong>Life Group Members Handout</strong> - Study guide for group members</li>
            </ul>

            <p class="intro-text">These materials are perfect for personal study, small group discussions, or teaching preparation.</p>
          </div>
          <div class="footer">
            <p><strong>SermonChronicler</strong></p>
            <p class="footer-tagline">Preserving the Message. Deepening the Study.</p>
            <p>Powered by AI • Built for the Church</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateSubscriptionEmail(channelData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6; 
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white;
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content { 
            padding: 40px 30px; 
          }
          .channel-name {
            font-size: 24px;
            font-weight: 600;
            color: #2d3748;
            margin: 0 0 20px 0;
          }
          .intro-text {
            color: #4a5568;
            margin-bottom: 30px;
          }
          .info-box {
            background: #e3f2fd;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 10px 0;
            color: #2d3748;
          }
          .benefits-list {
            margin: 20px 0;
            padding-left: 20px;
          }
          .benefits-list li {
            margin: 12px 0;
            color: #4a5568;
          }
          .footer { 
            padding: 30px; 
            text-align: center; 
            color: #718096; 
            font-size: 14px;
            background-color: #f7fafc;
          }
          .footer-tagline {
            margin: 5px 0;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📺 Subscription Confirmed!</h1>
          </div>
          <div class="content">
            <h2 class="channel-name">${channelData.name}</h2>
            <p class="intro-text">You're now subscribed to receive study materials for all new sermons from this channel.</p>
            
            <div class="info-box">
              <p><strong>✓ Subscription Active</strong></p>
              <p>You'll be automatically notified when new videos are processed.</p>
            </div>

            <p><strong>What happens next:</strong></p>
            <ul class="benefits-list">
              <li>We'll automatically monitor this channel for new sermon videos</li>
              <li>When a new video is published, we'll process it immediately</li>
              <li>You'll receive an email with download links once materials are ready</li>
              <li>Processing typically takes 2-5 minutes per sermon</li>
              <li>You can manage your subscription anytime</li>
            </ul>

            <p class="intro-text">All five study materials will be generated for each sermon: Clean Transcript, Sermon Notes, Keyword Study, Leaders Guide, and Members Handout.</p>
          </div>
          <div class="footer">
            <p><strong>SermonChronicler</strong></p>
            <p class="footer-tagline">Preserving the Message. Deepening the Study.</p>
            <p>Powered by AI • Built for the Church</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendTestEmail(email) {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@sermonchronicler.com',
      to: email,
      subject: 'SermonChronicler - Email Test',
      html: '<h1>Email Configuration Successful</h1><p>If you received this, your email service is configured correctly.</p>'
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Test email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send test email: ${error.message}`);
    }
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
