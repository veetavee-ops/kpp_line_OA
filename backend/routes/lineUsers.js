const express = require('express');
const router = express.Router();
const { User } = require('../models/index');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

router.use(authMiddleware, requireAdmin);

// GET /api/line-users — รายชื่อ LINE users ทั้งหมด
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['userId', 'displayName', 'pictureUrl', 'canSearch', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/line-users/:userId/search-permission — เปิด/ปิดสิทธิ์ค้นหา
router.patch('/:userId/search-permission', async (req, res) => {
  try {
    const { canSearch } = req.body;
    const [updated] = await User.update(
      { canSearch: !!canSearch },
      { where: { userId: req.params.userId } }
    );
    if (updated === 0) return res.status(404).json({ error: 'ไม่พบ user' });
    res.json({ ok: true, canSearch: !!canSearch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
