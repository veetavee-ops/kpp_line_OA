const { google } = require('googleapis');
const { Readable } = require('stream');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const folderCache = new Map();

async function ensureGroupFolder(groupName) {
    if (!ROOT_FOLDER_ID) return null;
    if (folderCache.has(groupName)) return folderCache.get(groupName);

    const res = await drive.files.list({
        q: `'${ROOT_FOLDER_ID}' in parents and name='${groupName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
    });

    if (res.data.files.length > 0) {
        const id = res.data.files[0].id;
        folderCache.set(groupName, id);
        return id;
    }

    const folder = await drive.files.create({
        requestBody: {
            name: groupName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [ROOT_FOLDER_ID],
        },
        fields: 'id',
    });
    folderCache.set(groupName, folder.data.id);
    return folder.data.id;
}

async function uploadFileToDrive(buffer, fileName, mimeType, folderId) {
    if (!folderId) return null;
    const stream = Readable.from(buffer);
    const res = await drive.files.create({
        requestBody: { name: fileName, parents: [folderId] },
        media: { mimeType, body: stream },
        fields: 'id',
    });
    return res.data.id;
}

module.exports = { ensureGroupFolder, uploadFileToDrive };
