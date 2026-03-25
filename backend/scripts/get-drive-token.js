const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

const { client_id, client_secret, redirect_uris } = require('../config/oauth-client.json').installed;
const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
});

console.log('เปิด URL นี้ใน browser:\n', url);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nวาง code ที่ได้มา: ', async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\nREFRESH_TOKEN:', tokens.refresh_token);
    rl.close();
});
