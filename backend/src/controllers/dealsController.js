import { prepare } from '../config/database.js';

export const getDeals = (req, res) => {
  const { page = 1, limit = 20, category, minDiscount = 0, search, active = 1 } = req.query;
  const offset = (page - 1) * limit;
  
  let sql = 'SELECT d.*, c.name as category_name FROM deals d LEFT JOIN categories c ON d.category_id = c.id WHERE d.is_active = ?';
  let countSql = 'SELECT COUNT(*) as count FROM deals d WHERE d.is_active = ?';
  const params = [active];
  const countParams = [active];

  if (category) {
    sql += ' AND d.category_id = ?';
    countSql += ' AND d.category_id = ?';
    params.push(category);
    countParams.push(category);
  }
  if (minDiscount > 0) {
    sql += ' AND d.discount_percent >= ?';
    countSql += ' AND d.discount_percent >= ?';
    params.push(minDiscount);
    countParams.push(minDiscount);
  }
  if (search) {
    sql += ' AND d.title LIKE ?';
    countSql += ' AND d.title LIKE ?';
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  const { count } = prepare(countSql).get(...countParams);
  sql += ' ORDER BY d.discount_percent DESC, d.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  const deals = prepare(sql).all(...params);

  res.json({ deals, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) } });
};

export const getDeal = (req, res) => {
  const deal = prepare('SELECT d.*, c.name as category_name FROM deals d LEFT JOIN categories c ON d.category_id = c.id WHERE d.id = ?').get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  res.json(deal);
};

export const createDeal = (req, res) => {
  try {
    const { ebay_item_id, title, description, image_url, original_price, current_price, currency, seller_name, seller_rating, condition, ebay_url, category_id } = req.body;
    const discount_percent = original_price ? Math.round(((original_price - current_price) / original_price) * 100) : 0;
    const result = prepare('INSERT INTO deals (ebay_item_id, title, description, image_url, original_price, current_price, discount_percent, currency, seller_name, seller_rating, condition, ebay_url, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(ebay_item_id, title, description, image_url, original_price, current_price, discount_percent, currency || 'USD', seller_name, seller_rating, condition, ebay_url, category_id);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Deal created successfully' });
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
};

export const updateDeal = (req, res) => {
  try {
    const dealId = req.params.id;
    const deal = prepare('SELECT * FROM deals WHERE id = ?').get(dealId);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const updates = req.body;
    if (updates.original_price || updates.current_price) {
      const originalPrice = updates.original_price || deal.original_price;
      const currentPrice = updates.current_price || deal.current_price;
      updates.discount_percent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }

    const fields = Object.keys(updates).filter(k => k !== 'id');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    prepare(`UPDATE deals SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, dealId);
    res.json({ message: 'Deal updated successfully' });
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
};

export const deleteDeal = (req, res) => {
  const result = prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Deal not found' });
  res.json({ message: 'Deal deleted successfully' });
};

export const toggleDealActive = (req, res) => {
  const deal = prepare('SELECT is_active FROM deals WHERE id = ?').get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const newStatus = deal.is_active ? 0 : 1;
  prepare('UPDATE deals SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, req.params.id);
  res.json({ message: 'Deal status updated', is_active: newStatus });
};

export const getPublicDeals = (req, res) => {
  const { page = 1, limit = 24, category, sort = 'discount' } = req.query;
  const offset = (page - 1) * limit;
  const minDiscount = 30;

  let sql = 'SELECT d.id, d.title, d.image_url, d.original_price, d.current_price, d.discount_percent, d.currency, d.condition, d.ebay_url, c.name as category_name, c.icon as category_icon FROM deals d LEFT JOIN categories c ON d.category_id = c.id WHERE d.is_active = 1 AND d.discount_percent >= ?';
  let countSql = 'SELECT COUNT(*) as count FROM deals d WHERE d.is_active = 1 AND d.discount_percent >= ?';
  const params = [minDiscount];

  if (category) { sql += ' AND d.category_id = ?'; countSql += ' AND d.category_id = ?'; params.push(category); }
  const { count } = prepare(countSql).get(...params);

  switch (sort) {
    case 'price_asc': sql += ' ORDER BY d.current_price ASC'; break;
    case 'price_desc': sql += ' ORDER BY d.current_price DESC'; break;
    case 'newest': sql += ' ORDER BY d.created_at DESC'; break;
    default: sql += ' ORDER BY d.discount_percent DESC';
  }
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  const deals = prepare(sql).all(...params);

  res.json({ deals, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) } });
};
