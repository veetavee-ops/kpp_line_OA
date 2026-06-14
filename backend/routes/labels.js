// routes/labels.js — จัดการ CRUD labels และการ assign กลุ่มเข้า label
const express = require('express');
const router = express.Router();
const { Label, GroupLabel } = require('../models/index');

// GET /api/labels — ดึง label ทั้งหมด พร้อม groupId ที่ assign ไว้ใน label นั้น
router.get('/', async (req, res) => {
  try {
    // ดึง label ทุกอัน รวมถึง assignments (ว่า label นี้มีกลุ่มไหนบ้าง)
    const labels = await Label.findAll({
      include: [{ model: GroupLabel, as: 'assignments', attributes: ['groupId'] }],
      order: [['id', 'ASC']],
    });

    // แปลงข้อมูลให้ groupIds เป็น array แบน เช่น ["Cxxx", "Cyyy"]
    const result = labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      groupIds: l.assignments.map((a) => a.groupId),
    }));

    res.json(result);
  } catch (err) {
    console.error('[ERROR] GET /api/labels:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/labels — สร้าง label ใหม่
// body: { name: "ชื่อ", color: "#hex" }
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'ต้องระบุชื่อ label' });
    }
    // บันทึก label ลงในตาราง Labels
    const label = await Label.create({ name: name.trim(), color: color || '#3b82f6' });
    res.json({ id: label.id, name: label.name, color: label.color, groupIds: [] });
  } catch (err) {
    console.error('[ERROR] POST /api/labels:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/labels/:id — ลบ label (ลบ assignments ออกด้วย)
router.delete('/:id', async (req, res) => {
  try {
    // ลบ assignments ก่อน (เพื่อไม่ให้ foreign key error)
    await GroupLabel.destroy({ where: { labelId: req.params.id } });
    // แล้วค่อยลบ label
    await Label.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ERROR] DELETE /api/labels/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/labels/:id/assign — เพิ่มกลุ่มเข้า label
// body: { groupId: "Cxxx..." }
router.post('/:id/assign', async (req, res) => {
  try {
    const { groupId } = req.body;
    // findOrCreate ป้องกันการ assign ซ้ำ
    await GroupLabel.findOrCreate({ where: { labelId: req.params.id, groupId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ERROR] POST /api/labels/:id/assign:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/labels/:id/assign/:groupId — เอากลุ่มออกจาก label
router.delete('/:id/assign/:groupId', async (req, res) => {
  try {
    await GroupLabel.destroy({
      where: { labelId: req.params.id, groupId: req.params.groupId },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ERROR] DELETE /api/labels/:id/assign/:groupId:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
