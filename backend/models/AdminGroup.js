const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminGroup = sequelize.define('AdminGroup', {
  adminId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'admins', key: 'id' },
  },
  groupId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: 'Groups', key: 'groupId' },
  },
}, {
  timestamps: false,
  indexes: [{ unique: true, fields: ['adminId', 'groupId'] }],
});

module.exports = AdminGroup;
