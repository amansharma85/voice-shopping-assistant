const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

let shoppingList = [];

// load shopping list from file if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.shoppingList)) shoppingList = parsed.shoppingList;
  }
} catch (e) {
  console.warn('Failed to load data.json', e);
}

// helper to save
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ shoppingList }, null, 2));
  } catch (e) {
    console.error('Failed to save data', e);
  }
}

// simple category assignment
const getCategory = (item) => {
  const s = item.toLowerCase();
  if (/(milk|cheese|butter|yogurt|ghee|almond milk)/.test(s)) return 'dairy';
  if (/(apple|banana|mango|orange|watermelon|corn|tomato|onion|potato|lettuce)/.test(s)) return 'produce';
  if (/(chips|cookies|chocolate|snack|soda)/.test(s)) return 'snacks';
  if (/(toothpaste|soap|shampoo|detergent)/.test(s)) return 'household';
  if (/(rice|wheat|bread|pasta)/.test(s)) return 'grains';
  return 'other';
};

const substitutes = {
  milk: 'almond milk',
  bread: 'multigrain bread',
  butter: 'ghee',
  sugar: 'jaggery',
  eggs: 'plant-based egg substitute'
};

// sample product catalogue (in real app, this will be DB)
const PRODUCTS = [
  { item: 'organic apples', brand: 'FreshFarm', price: 2.5, currency: 'USD' },
  { item: 'colgate toothpaste', brand: 'Colgate', price: 3.5, currency: 'USD' },
  { item: 'toothpaste', brand: 'Generic', price: 1.99, currency: 'USD' },
  { item: 'almond milk', brand: 'NutAlly', price: 4.0, currency: 'USD' },
  { item: 'multigrain bread', brand: 'Bakers', price: 2.0, currency: 'USD' },
  { item: 'watermelon', brand: 'FarmFresh', price: 5.0, currency: 'USD' },
];

// ➕ Add item (POST /add) - quantity defaults to 1
app.post('/add', (req, res) => {
  try {
    const { item, quantity } = req.body;
    if (!item || item.toString().trim() === '') {
      return res.status(400).json({ error: 'Item is required' });
    }
    const qty = Number.isFinite(Number(quantity)) ? Number(quantity) : 1;
    const normalized = item.toString().toLowerCase().trim();

    const existing = shoppingList.find(i => i.item === normalized);
    if (existing) {
      existing.quantity = Number(existing.quantity) + qty;
    } else {
      shoppingList.push({ item: normalized, quantity: qty, category: getCategory(normalized) });
    }

    saveData();
    return res.status(201).json({ message: 'Item added', shoppingList });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ❌ Remove item
app.delete('/remove', (req, res) => {
  try {
    const { item } = req.body;
    if (!item) return res.status(400).json({ error: 'Item is required' });
    const normalized = item.toString().toLowerCase().trim();
    shoppingList = shoppingList.filter(i => i.item !== normalized);
    saveData();
    return res.json({ message: 'Item removed', shoppingList });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear list
app.post('/clear', (req, res) => {
  try {
    shoppingList = [];
    saveData();
    return res.json({ message: 'Shopping list cleared', shoppingList });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 📋 Get list
app.get('/list', (req, res) => {
  res.json({ shoppingList });
});

// 💡 Smart suggestions (enhanced)
app.get('/suggestions', (req, res) => {
  const purchaseHistory = ['milk', 'bread', 'eggs'];
  const seasonalItems = ['mangoes', 'watermelon', 'corn'];
  const saleItems = ['toothpaste', 'chips'];

  const suggestions = [
    ...purchaseHistory.map(item => ({ type: 'history', item })),
    ...seasonalItems.map(item => ({ type: 'seasonal', item })),
    ...saleItems.map(item => ({ type: 'sale', item }))
  ];

  res.json({
    suggestions,
    substitutes
  });
});

// Search endpoint
app.get('/search', (req, res) => {
  try {
    const { q = '', brand, price } = req.query;
    const qLower = q.toString().toLowerCase();
    let results = PRODUCTS.filter(p =>
      p.item.toLowerCase().includes(qLower) ||
      p.brand.toLowerCase().includes(qLower)
    );

    if (brand) {
      results = results.filter(p => p.brand.toLowerCase().includes(brand.toString().toLowerCase()));
    }
    if (price) {
      const max = Number(price);
      if (!isNaN(max)) results = results.filter(p => Number(p.price) <= max);
    }

    results.sort((a, b) => a.price - b.price);
    res.json({ results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [] });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
