/**
 * migrate-missing-drive.js
 * รัน: node scripts/migrate-missing-drive.js
 *
 * Upload ไฟล์ที่มี gcsPath แต่ยังไม่มี driveFileId ขึ้น Google Drive
 */

require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const { Op } = require('sequelize');
const { Message, Group } = require('../models/index');
const { ensureGroupFolder, uploadFileToDrive } = require('../services/driveService');

const storage = new Storage({ keyFilename: process.env.GCS_KEY_FILE });
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

async function downloadFromGCS(gcsPath) {
    const file = bucket.file(gcsPath);
    const [buffer] = await file.download();
    return buffer;
}

async function main() {
    console.log('🚀 Migrate missing Drive files\n');

    // หา messages ที่มี gcsPath แต่ไม่มี driveFileId
    const messages = await Message.findAll({
        where: {
            messageType: 'file',
            metadata: { [Op.not]: null },
        },
        include: [{ model: Group, as: 'group', attributes: ['groupName'] }],
    });

    const missing = messages.filter(m =>
        m.metadata?.gcsPath && !m.metadata?.driveFileId
    );

    console.log(`พบ ${missing.length} ไฟล์ที่ต้อง migrate\n`);

    let success = 0;
    let failed = 0;

    for (const msg of missing) {
        const { gcsPath, fileName } = msg.metadata;
        const groupName = msg.group?.groupName;

        console.log(`📄 ${fileName || gcsPath}`);
        console.log(`   group: ${groupName || '(ไม่มี)'}`);
        console.log(`   gcsPath: ${gcsPath}`);

        if (!groupName) {
            console.log('   ⚠️  ไม่มี groupName ข้าม\n');
            failed++;
            continue;
        }

        try {
            const buffer = await downloadFromGCS(gcsPath);
            console.log(`   ⬇️  download จาก GCS: ${buffer.length} bytes`);

            const folderId = await ensureGroupFolder(groupName);
            if (!folderId) throw new Error('ได้ folderId เป็น null');

            const ext = gcsPath.split('.').pop() || 'bin';
            const mimeMap = {
                pdf: 'application/pdf',
                docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                zip: 'application/zip',
            };
            const mimeType = mimeMap[ext] || 'application/octet-stream';

            const driveFileId = await uploadFileToDrive(buffer, fileName || gcsPath.split('/').pop(), mimeType, folderId);
            console.log(`   ✅ Drive fileId: ${driveFileId}`);

            // อัพเดท DB
            await msg.update({
                metadata: { ...msg.metadata, driveFileId }
            });
            console.log(`   💾 อัพเดท DB แล้ว\n`);
            success++;
        } catch (err) {
            console.error(`   ❌ Error: ${err.message}\n`);
            failed++;
        }
    }

    console.log('═══════════════════════════════════');
    console.log(`✅ สำเร็จ: ${success} ไฟล์`);
    console.log(`❌ ล้มเหลว: ${failed} ไฟล์`);
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
