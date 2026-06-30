const { Router } = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');

const router = Router();

// Get all active categories (with subcategories)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get top-level categories formatted for navigation (showInNav = true)
router.get('/nav', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true, showInNav: true })
      .sort({ displayOrder: 1, name: 1 })
      .select('name slug link showInNav subCategories displayOrder');

    const navItems = categories.map((cat) => ({
      name: cat.name,
      href: cat.link || `/shop?category=${cat.slug}`,
      items: (cat.subCategories || [])
        .filter((sub) => sub.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((sub) => ({
          label: sub.name,
          href: sub.link || `/shop?category=${cat.slug}&sub=${sub.slug}`
        }))
    }));

    res.json(navItems);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching nav categories' });
  }
});

// Get a single category by slug
router.get('/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching category' });
  }
});

// Get products by category slug
router.get('/:slug/products', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    const products = await Product.find({ categoryId: category._id }).populate('categoryId', 'name slug');
    res.json({ category, products });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products for category' });
  }
});

// --- Subcategory endpoints ---

// Add a subcategory to a category
router.post('/:id/subcategories', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const { name, slug, link, displayOrder, isActive } = req.body;
    category.subCategories.push({
      name,
      slug: slug || name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      link,
      displayOrder: Number(displayOrder) || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Error adding subcategory', error: err.message });
  }
});

// Update a subcategory
router.put('/:id/subcategories/:subId', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const sub = category.subCategories.id(req.params.subId);
    if (!sub) return res.status(404).json({ message: 'Subcategory not found' });

    const { name, slug, link, displayOrder, isActive } = req.body;
    if (name !== undefined) sub.name = name;
    if (slug !== undefined) sub.slug = slug;
    if (link !== undefined) sub.link = link;
    if (displayOrder !== undefined) sub.displayOrder = Number(displayOrder);
    if (isActive !== undefined) sub.isActive = isActive;

    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Error updating subcategory', error: err.message });
  }
});

// Delete a subcategory
router.delete('/:id/subcategories/:subId', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.subCategories = category.subCategories.filter(
      (sub) => sub._id.toString() !== req.params.subId
    );

    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Error deleting subcategory', error: err.message });
  }
});

module.exports = router;
