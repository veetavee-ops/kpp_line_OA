const express = require('express');
const router = express.Router();
const { Message, Group, User } = require('../models/index');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

// GET /api/groups — returns ALL groups/private chats (no date filter)
router.get('/', async (req, res) => {
  try {
    // Fetch ALL private chats, grouped by displayName (not userId)
    // So users with the same displayName appear as ONE chat entry
    let privateChats = [];
    try {
      privateChats = await sequelize.query(`
        SELECT
          CONCAT('private_name_', u."displayName") as "groupId",
          u."displayName" as "groupName",
          MAX(u."pictureUrl") as "pictureUrl",
          TRUE as "isPrivate",
          MAX(m.timestamp) as "lastMessageTime"
        FROM messages m
        INNER JOIN "Users" u ON u."userId" = m."userId"
        WHERE (m."groupId" IS NULL OR m."groupId" = '')
        GROUP BY u."displayName"
        ORDER BY "lastMessageTime" DESC
      `, {
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error('[ERROR] Fetching private chats:', error.message);
    }

    // Fetch ALL group chats (any group that ever had a message)
    let groupChats = [];
    try {
      const groupMessages = await Message.findAll({
        where: {
          groupId: { [Op.ne]: null, [Op.ne]: '' },
        },
        attributes: [
          'groupId',
          [sequelize.fn('MAX', sequelize.col('timestamp')), 'lastMessageTime'],
        ],
        include: [{ model: Group, as: 'group', attributes: ['groupName', 'pictureUrl'] }],
        group: ['Message.groupId', 'group.groupId'],
        order: [[sequelize.fn('MAX', sequelize.col('timestamp')), 'DESC']],
      });

      groupChats = groupMessages.map((m) => ({
        groupId: m.groupId,
        groupName: m.group?.groupName || 'Unknown Group',
        pictureUrl: m.group?.pictureUrl,
        isPrivate: false,
        lastMessageTime: m.dataValues.lastMessageTime,
      }));
    } catch (error) {
      console.error('[ERROR] Fetching group chats:', error.message);
    }

    res.json([...privateChats, ...groupChats]);
  } catch (error) {
    console.error('[ERROR] GET /api/groups:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;