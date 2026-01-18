/**
 * Email Service for sending 2FA codes and other notifications
 * Uses nodemailer with Gmail SMTP
 */

import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      console.log('⚠️ Email service not configured (EMAIL_USER/EMAIL_PASS missing)');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass // Use App Password for Gmail
      }
    });

    this.initialized = true;
    console.log('✅ Email service initialized');
  }

  isConfigured() {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  }

  /**
   * Generate a random 6-digit verification code
   */
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send 2FA verification code via email
   */
  async sendTwoFactorCode(email, code, userName = 'User') {
    if (!this.isConfigured()) {
      console.log('⚠️ Email not configured, code:', code);
      return { success: false, error: 'Email service not configured' };
    }

    this.initialize();

    const mailOptions = {
      from: {
        name: 'Dealsluxy Security',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔐 Your Dealsluxy Login Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
              <td style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🔐 Verification Code</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                  Hello <strong>${userName}</strong>,
                </p>
                <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                  You're trying to sign in to your Dealsluxy Admin account. Use the verification code below to complete your login:
                </p>
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px;">
                  <p style="margin: 0 0 10px; color: #888888; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">
                    Your Code
                  </p>
                  <p style="margin: 0; color: #f97316; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                    ${code}
                  </p>
                </div>
                <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                  ⏱️ This code will expire in <strong>10 minutes</strong>.
                </p>
                <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                  If you didn't request this code, please ignore this email or contact support if you have concerns.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  This is an automated message from Dealsluxy. Please do not reply.
                </p>
                <p style="margin: 10px 0 0; color: #999999; font-size: 12px;">
                  © ${new Date().getFullYear()} Dealsluxy.com - Premium Deals
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Your Dealsluxy Verification Code

Hello ${userName},

You're trying to sign in to your Dealsluxy Admin account.

Your verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

- Dealsluxy Team
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`📧 2FA code sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email, resetToken) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Email service not configured' };
    }

    this.initialize();

    const resetUrl = `https://dealsluxy.com/admin/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: {
        name: 'Dealsluxy',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔑 Reset Your Dealsluxy Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Password Reset Request</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #f97316, #ef4444); color: white; text-decoration: none; border-radius: 8px;">
            Reset Password
          </a>
          <p style="margin-top: 20px; color: #666;">This link expires in 1 hour.</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();

