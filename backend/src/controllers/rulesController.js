import { prepare } from '../config/database.js';
import scheduler from '../services/scheduler.js';

export const getRules = (req, res) => {
  const rules = prepare('SELECT * FROM query_rules ORDER BY created_at DESC').all();
  res.json(rules);
};

export const getRule = (req, res) => {
  const rule = prepare('SELECT * FROM query_rules WHERE id = ?').get(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
};

export const createRule = (req, res) => {
  try {
    const { name, keywords, ebay_category_ids, min_price, max_price, min_discount, schedule_cron, is_active } = req.body;
    const result = prepare('INSERT INTO query_rules (name, keywords, ebay_category_ids, min_price, max_price, min_discount, schedule_cron, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(name, keywords, ebay_category_ids, min_price || 0, max_price || 10000, min_discount || 30, schedule_cron || '0 0 * * *', is_active !== undefined ? is_active : 1);
    const newRule = prepare('SELECT * FROM query_rules WHERE id = ?').get(result.lastInsertRowid);
    if (newRule.is_active) scheduler.scheduleRule(newRule);
    res.status(201).json(newRule);
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
};

export const updateRule = (req, res) => {
  try {
    const ruleId = req.params.id;
    const rule = prepare('SELECT * FROM query_rules WHERE id = ?').get(ruleId);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const updates = req.body;
    const fields = Object.keys(updates).filter(k => k !== 'id');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    prepare(`UPDATE query_rules SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, ruleId);
    scheduler.refreshRule(parseInt(ruleId));
    res.json({ message: 'Rule updated successfully' });
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
};

export const deleteRule = (req, res) => {
  const ruleId = req.params.id;
  scheduler.refreshRule(parseInt(ruleId));
  const result = prepare('DELETE FROM query_rules WHERE id = ?').run(ruleId);
  if (result.changes === 0) return res.status(404).json({ error: 'Rule not found' });
  prepare('DELETE FROM query_logs WHERE rule_id = ?').run(ruleId);
  res.json({ message: 'Rule deleted successfully' });
};

export const executeRule = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const rule = prepare('SELECT * FROM query_rules WHERE id = ?').get(ruleId);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const result = await scheduler.executeRule(parseInt(ruleId));
    res.json({ message: 'Rule executed', ...result });
  } catch (error) {
    console.error('Execute rule error:', error);
    res.status(500).json({ error: 'Failed to execute rule' });
  }
};

export const getRuleLogs = (req, res) => {
  const { limit = 50 } = req.query;
  const logs = prepare('SELECT * FROM query_logs WHERE rule_id = ? ORDER BY created_at DESC LIMIT ?').all(req.params.id, parseInt(limit));
  res.json(logs);
};

export const getAllLogs = (req, res) => {
  const { limit = 100 } = req.query;
  const logs = prepare('SELECT l.*, r.name as rule_name FROM query_logs l LEFT JOIN query_rules r ON l.rule_id = r.id ORDER BY l.created_at DESC LIMIT ?').all(parseInt(limit));
  res.json(logs);
};
