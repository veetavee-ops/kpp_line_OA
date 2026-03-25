require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const { Message, Group } = require('../models/index');
const { ensureGroupFolder, uploadFileToDrive } = require('../services/driveService');

const storage = new Storage({ keyFilename: process.env.GCS_KEY_FILE });
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

async function run() {
    const messages = await Message.findAll({
        where: { messageType: 'file' },
        include: [{ model: Group, as: 'group', attributes: ['groupName'] }]
    });

    console.log(`Found ${messages.length} file messages`);

    for (const msg of messages) {
        const gcsPath = msg.metadata?.gcsPath;
        const fileName = msg.metadata?.fileName;
        const groupName = msg.group?.groupName;

        if (!gcsPath) {
            console.log(`⏭️  Skip (no gcsPath): ${msg.id}`);
            continue;
        }
        if (!groupName) {
            console.log(`⏭️  Skip (no group): ${msg.id}`);
            continue;
        }

        try {
            // Download from GCS
            const [buffer] = await bucket.file(gcsPath).download();

            // Upload to Drive
            const folderId = await ensureGroupFolder(groupName);
            if (!folderId) {
                console.log(`⏭️  Skip (no Drive folder): ${groupName}`);
                continue;
            }
            const driveFileId = await uploadFileToDrive(buffer, fileName || gcsPath.split('/').pop(), 'application/octet-stream', folderId);
            await Message.update(
                { metadata: { ...msg.metadata, driveFileId } },
                { where: { id: msg.id } }
            );
            console.log(`✅ ${groupName} / ${fileName} (driveFileId: ${driveFileId})`);
        } catch (e) {
            console.error(`❌ ${msg.id}: ${e.message}`);
        }
    }

    console.log('Done');
    process.exit(0);
}

run();
