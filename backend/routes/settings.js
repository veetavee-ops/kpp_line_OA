const express = require('express');
const router = express.Router();
const { Setting } = require('../models/index');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

router.use(authMiddleware, requireAdmin);

// GET /api/settings — ดึงค่า settings ทั้งหมด
router.get('/', async (req, res) => {
  try {
    const rows = await Setting.findAll({ raw: true });
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings/:key — อัปเดตค่า setting
router.patch('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    await Setting.upsert({ key: req.params.key, value: String(value) });
    res.json({ ok: true, key: req.params.key, value: String(value) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
