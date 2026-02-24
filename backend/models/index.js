const User = require('./User');
const Group = require('./Group');
const Message = require('./Message');
const Admin = require('./Admin');

// Associations
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Message.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
User.hasMany(Message, { foreignKey: 'userId' });
Group.hasMany(Message, { foreignKey: 'groupId' });

module.exports = {
  User,
  Group,
  Message,
  Admin
};