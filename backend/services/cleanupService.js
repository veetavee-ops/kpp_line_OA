/**
 * cleanupService.js
 * Nightly cron: delete media files older than 90 days to prevent disk full.
 */
const fs = require('fs');
const path = require('path');

const MEDIA_DIRS = [
    path.join(__dirname, '..', 'media', 'images'),
    path.join(__dirname, '..', 'media', 'videos'),
    path.join(__dirname, '..', 'media', 'audios'),
    path.join(__dirname, '..', 'media', 'files'),
];

const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function cleanupOldFiles() {
    const now = Date.now();
    let deleted = 0;

    for (const dir of MEDIA_DIRS) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            try {
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs > MAX_AGE_MS) {
                    fs.unlinkSync(filePath);
                    deleted++;
                }
            } catch (e) {
                console.error(`[Cleanup] Error deleting ${filePath}:`, e.message);
            }
        }
    }

    if (deleted > 0) console.log(`[Cleanup] Deleted ${deleted} files older than 90 days`);
}

/**
 * Start nightly cleanup cron (runs at 2:00 AM every day).
 * Call this function once from server.js on startup.
 */
function startCleanupCron() {
    // Run once at startup to clear any very old files
    cleanupOldFiles();

    // Schedule to run every 24h, aligned to next 2AM
    const now = new Date();
    const next2AM = new Date(now);
    next2AM.setHours(2, 0, 0, 0);
    if (next2AM <= now) next2AM.setDate(next2AM.getDate() + 1);

    const msUntilNext2AM = next2AM - now;

    setTimeout(() => {
        cleanupOldFiles();
        // After first aligned run, repeat every 24h
        setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000);
    }, msUntilNext2AM);

    console.log(`[Cleanup] Cron scheduled. Next run at ${next2AM.toLocaleString('th-TH')}`);
}

module.exports = { startCleanupCron };
