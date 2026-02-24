const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

// GET /api/dates?rangeValue=7&rangeUnit=day
// Returns distinct dates that have messages within the given range
// If no range params → returns ALL dates
router.get('/', async (req, res) => {
  try {
    const { rangeValue, rangeUnit } = req.query;

    let whereClause = '';

    if (rangeValue && rangeUnit) {
      const value = parseInt(rangeValue, 10);
      // Map Thai unit names to PostgreSQL interval keywords
      const unitMap = { day: 'days', month: 'months', year: 'years' };
      const pgUnit = unitMap[rangeUnit] || 'days';
      whereClause = `WHERE timestamp >= NOW() - INTERVAL '${value} ${pgUnit}'`;
    }

    const [results] = await sequelize.query(`
      SELECT DISTINCT DATE(timestamp AT TIME ZONE 'Asia/Bangkok') as date_val
      FROM "messages"
      ${whereClause}
      ORDER BY date_val DESC
    `);

    const dates = results.map((r) => {
      const raw = r.date_val || r.DATE_VAL || r.date;
      const d = new Date(raw);
      return d.toISOString().split('T')[0];
    });

    res.json(dates);
  } catch (error) {
    console.error('[ERROR] GET /api/dates:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;