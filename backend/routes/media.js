const express = require('express');
const router = express.Router();
const { getSignedUrl } = require('../services/gcsService');

// Cache signed URLs for 50 min to avoid IAM signBlob rate limits
const urlCache = new Map();

// GET /api/media?path=media/images/2026/03/abc123.jpg
router.get('/', async (req, res) => {
    const gcsPath = req.query.path;
    if (!gcsPath) return res.status(400).json({ error: 'path required' });

    const cached = urlCache.get(gcsPath);
    if (cached && cached.expiresAt > Date.now()) {
        return res.redirect(cached.url);
    }

    try {
        const url = await getSignedUrl(gcsPath, 60);
        urlCache.set(gcsPath, { url, expiresAt: Date.now() + 50 * 60 * 1000 });
        res.redirect(url);
    } catch (e) {
        console.error('❌ Media proxy error:', e.message);
        res.status(404).json({ error: 'File not found' });
    }
});

module.exports = router;
