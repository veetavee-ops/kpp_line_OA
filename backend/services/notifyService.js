const { client } = require('./lineService');

const ADMIN_USER_ID = process.env.ADMIN_LINE_USER_ID;

async function notifyAdmin(message) {
    if (!ADMIN_USER_ID) return;
    try {
        await client.pushMessage(ADMIN_USER_ID, {
            type: 'text',
            text: message,
        });
    } catch (e) {
        console.error('[NOTIFY] Failed to send admin notification:', e.message);
    }
}

function alertError(service, error) {
    const msg = `⚠️ [${service}] มีปัญหา\n${error}`;
    console.error(msg);
    notifyAdmin(msg);
}

module.exports = { notifyAdmin, alertError };
