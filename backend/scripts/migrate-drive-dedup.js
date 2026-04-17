/**
 * migrate-drive-dedup.js
 * รัน: node scripts/migrate-drive-dedup.js
 *
 * 1. วนทุกไฟล์ใน Drive (ใต้ ROOT_FOLDER_ID) ที่ยังไม่มี appProperties.contentHash
 * 2. Download → compute MD5 → อัพเดต appProperties
 * 3. หาตัวซ้ำ (hash + folderId เดียวกัน) → เก็บตัวเก่าสุด ลบที่เหลือ
 */

require('dotenv').config();
const { google } = require('googleapis');
const crypto = require('crypto');
const axios = require('axios');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// List all files (not folders) under a given parent, handling pagination
async function listAllFiles(folderId) {
    const files = [];
    let pageToken = null;
    do {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'nextPageToken, files(id, name, createdTime, appProperties)',
            pageSize: 100,
            ...(pageToken && { pageToken }),
        });
        files.push(...res.data.files);
        pageToken = res.data.nextPageToken || null;
    } while (pageToken);
    return files;
}

// List all group folders directly under ROOT_FOLDER_ID
async function listGroupFolders() {
    const folders = [];
    let pageToken = null;
    do {
        const res = await drive.files.list({
            q: `'${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'nextPageToken, files(id, name)',
            pageSize: 100,
            ...(pageToken && { pageToken }),
        });
        folders.push(...res.data.files);
        pageToken = res.data.nextPageToken || null;
    } while (pageToken);
    return folders;
}

async function downloadFile(fileId) {
    const token = await oauth2Client.getAccessToken();
    const response = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            headers: { Authorization: `Bearer ${token.token}` },
            responseType: 'arraybuffer',
        }
    );
    return Buffer.from(response.data);
}

async function main() {
    console.log('🚀 Drive deduplication migration\n');

    const folders = await listGroupFolders();
    console.log(`📁 พบ ${folders.length} กลุ่ม\n`);

    let totalFiles = 0;
    let taggedNew = 0;
    let deleted = 0;

    for (const folder of folders) {
        console.log(`\n📂 ${folder.name}`);
        const files = await listAllFiles(folder.id);
        console.log(`   ไฟล์ทั้งหมด: ${files.length}`);
        totalFiles += files.length;

        // --- Step 1: Tag files that don't have contentHash yet ---
        for (const file of files) {
            if (file.appProperties?.contentHash) continue;

            process.stdout.write(`   ⏳ hash: ${file.name} ... `);
            try {
                const buffer = await downloadFile(file.id);
                const hash = crypto.createHash('md5').update(buffer).digest('hex');
                await drive.files.update({
                    fileId: file.id,
                    requestBody: { appProperties: { contentHash: hash } },
                });
                file.appProperties = { contentHash: hash };
                process.stdout.write(`✅ ${hash.slice(0, 8)}\n`);
                taggedNew++;
            } catch (e) {
                process.stdout.write(`❌ ${e.message}\n`);
            }
        }

        // --- Step 2: Group by hash, delete duplicates (keep oldest) ---
        const hashMap = new Map(); // hash → [files sorted by createdTime asc]
        for (const file of files) {
            const hash = file.appProperties?.contentHash;
            if (!hash) continue;
            if (!hashMap.has(hash)) hashMap.set(hash, []);
            hashMap.get(hash).push(file);
        }

        for (const [hash, dupes] of hashMap.entries()) {
            if (dupes.length <= 1) continue;

            // Sort oldest first → keep [0], delete the rest
            dupes.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
            const keep = dupes[0];
            const toDelete = dupes.slice(1);

            console.log(`   🔁 ซ้ำ (${hash.slice(0, 8)}): เก็บ "${keep.name}" ลบ ${toDelete.length} ตัว`);
            for (const f of toDelete) {
                try {
                    await drive.files.delete({ fileId: f.id });
                    console.log(`      🗑️  ลบ: ${f.name} (${f.id})`);
                    deleted++;
                } catch (e) {
                    console.log(`      ❌ ลบไม่ได้: ${f.name} — ${e.message}`);
                }
            }
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ เสร็จสิ้น`);
    console.log(`   ไฟล์ทั้งหมด : ${totalFiles}`);
    console.log(`   เพิ่ม hash  : ${taggedNew}`);
    console.log(`   ลบซ้ำ      : ${deleted}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((e) => {
    console.error('❌ Fatal:', e.message);
    process.exit(1);
});
