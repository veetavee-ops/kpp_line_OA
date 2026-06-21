/**
 * refresh-drive-token.js
 * รัน: node scripts/refresh-drive-token.js
 * เพื่อขอ Google Drive refresh token ใหม่
 */
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ ต้องตั้ง GOOGLE_DRIVE_CLIENT_ID และ GOOGLE_DRIVE_CLIENT_SECRET ใน .env ก่อน');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
});

console.log('\n=== Google Drive Re-Authorization ===\n');
console.log('1. เปิด URL นี้ใน browser:\n');
console.log(authUrl);
console.log('\n2. ล็อกอิน Google account → กด Allow');
console.log('3. Copy authorization code ที่ได้\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('วาง code ที่นี่: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code.trim());
        if (!tokens.refresh_token) {
            console.log('\n⚠️  ไม่ได้ refresh_token — ลองอีกครั้ง (ต้องกด "Allow" ใหม่)');
        } else {
            console.log('\n✅ สำเร็จ! Refresh token ใหม่:\n');
            console.log(tokens.refresh_token);
            console.log('\n--- อัปเดตบน server ---');
            console.log('ssh root@168.144.137.42');
            console.log(`sed -i 's/^GOOGLE_DRIVE_REFRESH_TOKEN=.*/GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}/' /opt/lineoa/.env`);
            console.log('cd /opt/lineoa && docker compose restart');
        }
    } catch (e) {
        console.error('\n❌ Error:', e.message);
        if (e.message.includes('invalid_grant')) {
            console.log('\nลอง: เปิด URL ใหม่อีกครั้งและ copy code ให้ถูกต้อง');
        }
    }
    rl.close();
});
