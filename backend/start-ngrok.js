require('dotenv').config()
const { execSync } = require('child_process')

const token = process.env.NGROK_AUTHTOKEN
if (token) execSync(`ngrok config add-authtoken ${token}`, { stdio: 'inherit' })
execSync('ngrok http --url=hendrix-vizarded-irina.ngrok-free.dev 3000', { stdio: 'inherit' })
