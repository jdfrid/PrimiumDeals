import bcrypt from 'bcryptjs';
import { prepare } from '../config/database.js';

export const getUsers = (req, res) => {
  const users = prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
};

export const getUser = (req, res) => {
  const user = prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

export const createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const existingUser = prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(email, hashedPassword, name, role || 'viewer');

    res.status(201).json({ id: result.lastInsertRowid, email, name, role: role || 'viewer' });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { email, name, role, password } = req.body;
    const userId = req.params.id;

    const user = prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email && email !== user.email) {
      const existing = prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
      if (existing) return res.status(400).json({ error: 'Email already exists' });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      prepare('UPDATE users SET email = ?, name = ?, role = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(email || user.email, name || user.name, role || user.role, hashedPassword, userId);
    } else {
      prepare('UPDATE users SET email = ?, name = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(email || user.email, name || user.name, role || user.role, userId);
    }

    res.json({ id: parseInt(userId), email: email || user.email, name: name || user.name, role: role || user.role });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = (req, res) => {
  const userId = req.params.id;
  if (parseInt(userId) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

  const result = prepare('DELETE FROM users WHERE id = ?').run(userId);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });

  res.json({ message: 'User deleted successfully' });
};
