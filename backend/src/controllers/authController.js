import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prepare, saveDatabase } from '../config/database.js';
import emailService from '../services/emailService.js';

/**
 * Step 1: Verify credentials and send 2FA code
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔑 Login attempt for: ${email}`);
    
    const user = prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ error: 'User not found. Try resetting admin at /api/auth/reset-admin' });
    }
    
    console.log(`✅ User found: ${user.email}, role: ${user.role}`);

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    console.log(`✅ Password valid for: ${email}`);

    // Check if 2FA is enabled (check environment variable)
    const twoFactorEnabled = process.env.TWO_FACTOR_ENABLED === 'true';
    
    if (twoFactorEnabled && emailService.isConfigured()) {
      // Generate 2FA code
      const code = emailService.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Clean up old codes for this user
      prepare('DELETE FROM two_factor_codes WHERE user_id = ?').run(user.id);
      
      // Save new code
      prepare(`
        INSERT INTO two_factor_codes (user_id, code, expires_at) 
        VALUES (?, ?, ?)
      `).run(user.id, code, expiresAt.toISOString());
      
      // Send code via email
      const emailResult = await emailService.sendTwoFactorCode(user.email, code, user.name);
      
      if (!emailResult.success) {
        console.log(`⚠️ Failed to send 2FA email: ${emailResult.error}`);
        // Fall back to direct login if email fails
        return directLogin(user, res);
      }
      
      console.log(`📧 2FA code sent to: ${email}`);
      
      // Return success but require 2FA verification
      return res.json({
        requiresTwoFactor: true,
        userId: user.id,
        email: user.email,
        message: 'Verification code sent to your email'
      });
    }
    
    // 2FA not enabled - direct login
    return directLogin(user, res);
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};

/**
 * Step 2: Verify 2FA code and complete login
 */
export const verifyTwoFactor = async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and code are required' });
    }
    
    console.log(`🔐 2FA verification for user ID: ${userId}`);
    
    // Find the code
    const twoFactorRecord = prepare(`
      SELECT * FROM two_factor_codes 
      WHERE user_id = ? AND code = ? AND used = 0
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(userId, code);
    
    if (!twoFactorRecord) {
      console.log(`❌ Invalid 2FA code for user: ${userId}`);
      return res.status(401).json({ error: 'Invalid verification code' });
    }
    
    // Check expiration
    const expiresAt = new Date(twoFactorRecord.expires_at);
    if (expiresAt < new Date()) {
      console.log(`❌ Expired 2FA code for user: ${userId}`);
      prepare('DELETE FROM two_factor_codes WHERE id = ?').run(twoFactorRecord.id);
      return res.status(401).json({ error: 'Verification code has expired. Please login again.' });
    }
    
    // Mark code as used
    prepare('UPDATE two_factor_codes SET used = 1 WHERE id = ?').run(twoFactorRecord.id);
    
    // Clean up all codes for this user
    prepare('DELETE FROM two_factor_codes WHERE user_id = ?').run(userId);
    
    // Get user
    const user = prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`✅ 2FA verified successfully for: ${user.email}`);
    
    // Complete login
    return directLogin(user, res);
    
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Verification failed: ' + error.message });
  }
};

/**
 * Resend 2FA code
 */
export const resendTwoFactorCode = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check rate limit - last code must be at least 30 seconds old
    const lastCode = prepare(`
      SELECT created_at FROM two_factor_codes 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(userId);
    
    if (lastCode) {
      const lastCodeTime = new Date(lastCode.created_at);
      const timeSince = Date.now() - lastCodeTime.getTime();
      if (timeSince < 30000) {
        return res.status(429).json({ 
          error: 'Please wait before requesting a new code',
          waitSeconds: Math.ceil((30000 - timeSince) / 1000)
        });
      }
    }
    
    // Generate new code
    const code = emailService.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Clean up old codes
    prepare('DELETE FROM two_factor_codes WHERE user_id = ?').run(userId);
    
    // Save new code
    prepare(`
      INSERT INTO two_factor_codes (user_id, code, expires_at) 
      VALUES (?, ?, ?)
    `).run(userId, code, expiresAt.toISOString());
    
    // Send email
    const emailResult = await emailService.sendTwoFactorCode(user.email, code, user.name);
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send verification code' });
    }
    
    console.log(`📧 2FA code resent to: ${user.email}`);
    
    res.json({ success: true, message: 'New verification code sent to your email' });
    
  } catch (error) {
    console.error('Resend 2FA error:', error);
    res.status(500).json({ error: 'Failed to resend code: ' + error.message });
  }
};

/**
 * Direct login - generates JWT token
 */
function directLogin(user, res) {
  if (!process.env.JWT_SECRET) {
    console.log('❌ JWT_SECRET not configured!');
    return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  console.log(`✅ Login successful for: ${user.email}`);

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
}

export const getProfile = (req, res) => {
  const user = prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, req.user.id);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

/**
 * Check 2FA status
 */
export const getTwoFactorStatus = (req, res) => {
  res.json({
    enabled: process.env.TWO_FACTOR_ENABLED === 'true',
    emailConfigured: emailService.isConfigured()
  });
};
