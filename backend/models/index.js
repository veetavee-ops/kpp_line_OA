const User = require('./User');
const Group = require('./Group');
const Message = require('./Message');
const Admin = require('./Admin');
const Label = require('./Label');
const GroupLabel = require('./GroupLabel');

// ความสัมพันธ์ระหว่าง Message, User, Group
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Message.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
User.hasMany(Message, { foreignKey: 'userId' });
Group.hasMany(Message, { foreignKey: 'groupId' });

// ความสัมพันธ์ระหว่าง Label ↔ Group (many-to-many ผ่าน GroupLabel)
Label.hasMany(GroupLabel, { foreignKey: 'labelId', as: 'assignments' });
GroupLabel.belongsTo(Label, { foreignKey: 'labelId' });

module.exports = {
  User,
  Group,
  Message,
  Admin,
  Label,
  GroupLabel,
};