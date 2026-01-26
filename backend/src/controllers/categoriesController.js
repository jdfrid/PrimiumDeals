import { prepare } from '../config/database.js';

export const getCategories = (req, res) => {
  const categories = prepare('SELECT c.*, COUNT(d.id) as deal_count FROM categories c LEFT JOIN deals d ON c.id = d.category_id AND d.is_active = 1 GROUP BY c.id ORDER BY c.name').all();
  res.json(categories);
};

export const getCategory = (req, res) => {
  const category = prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json(category);
};

export const createCategory = (req, res) => {
  try {
    const { name, name_he, ebay_category_id, icon } = req.body;
    const existing = prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (existing) return res.status(400).json({ error: 'Category already exists' });

    const result = prepare('INSERT INTO categories (name, name_he, ebay_category_id, icon) VALUES (?, ?, ?, ?)').run(name, name_he, ebay_category_id, icon);
    res.status(201).json({ id: result.lastInsertRowid, name, name_he, ebay_category_id, icon });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = (req, res) => {
  try {
    const { name, name_he, ebay_category_id, icon } = req.body;
    const categoryId = req.params.id;
    const category = prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    prepare('UPDATE categories SET name = ?, name_he = ?, ebay_category_id = ?, icon = ? WHERE id = ?').run(name || category.name, name_he || category.name_he, ebay_category_id || category.ebay_category_id, icon || category.icon, categoryId);
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = (req, res) => {
  const deals = prepare('SELECT COUNT(*) as count FROM deals WHERE category_id = ?').get(req.params.id);
  if (deals.count > 0) return res.status(400).json({ error: 'Cannot delete category with existing deals' });

  const result = prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Category not found' });
  res.json({ message: 'Category deleted successfully' });
};

export const getPublicCategories = (req, res) => {
  const categories = prepare('SELECT c.id, c.name, c.name_he, c.icon, COUNT(d.id) as deal_count FROM categories c INNER JOIN deals d ON c.id = d.category_id AND d.is_active = 1 AND d.discount_percent >= 30 GROUP BY c.id HAVING deal_count > 0 ORDER BY deal_count DESC').all();
  res.json(categories);
};
