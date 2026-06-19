const express = require('express');
const router = express.Router();
const { Admin, AdminGroup } = require('../models/index');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

router.use(authMiddleware, requireAdmin);

// GET /api/users — list ผู้ใช้ทั้งหมด พร้อม groupId ที่ assign ไว้
router.get('/', async (req, res) => {
  try {
    const users = await Admin.findAll({
      attributes: ['id', 'username', 'role', 'createdAt'],
      include: [{ model: AdminGroup, as: 'groupAccess', attributes: ['groupId'] }],
      order: [['createdAt', 'ASC']],
    });
    const result = users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      groupIds: u.groupAccess.map((g) => g.groupId),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — สร้าง user ใหม่ (admin กรอกให้)
router.post('/', async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'ต้องระบุ username และ password' });
    const existing = await Admin.findOne({ where: { username } });
    if (existing) return res.status(400).json({ error: 'Username นี้มีอยู่แล้ว' });
    const user = await Admin.create({ username, password, role });
    res.json({ id: user.id, username: user.username, role: user.role, groupIds: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id — ลบ user
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.admin.id) return res.status(400).json({ error: 'ลบตัวเองไม่ได้' });
    await AdminGroup.destroy({ where: { adminId: req.params.id } });
    await Admin.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/groups — assign กลุ่มให้ user
router.post('/:id/groups', async (req, res) => {
  try {
    const { groupId } = req.body;
    await AdminGroup.findOrCreate({ where: { adminId: req.params.id, groupId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id/groups/:groupId — เอากลุ่มออกจาก user
router.delete('/:id/groups/:groupId', async (req, res) => {
  try {
    await AdminGroup.destroy({ where: { adminId: req.params.id, groupId: req.params.groupId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
