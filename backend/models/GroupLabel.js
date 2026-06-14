// ตารางกลาง เชื่อม Label ↔ Group แบบ many-to-many
// หมายความว่า 1 กลุ่มมีได้หลาย label, 1 label มีได้หลายกลุ่ม
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GroupLabel = sequelize.define('GroupLabel', {
  // รหัส label ที่จะ assign (อ้างอิงจากตาราง Labels)
  labelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Labels', key: 'id' },
  },
  // รหัสกลุ่ม LINE (อ้างอิงจากตาราง Groups)
  groupId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: 'Groups', key: 'groupId' },
  },
}, {
  timestamps: false,
  // ป้องกัน duplicate — ไม่ให้ assign กลุ่มเดิมเข้า label เดิมซ้ำ
  indexes: [{ unique: true, fields: ['labelId', 'groupId'] }],
});

module.exports = GroupLabel;
