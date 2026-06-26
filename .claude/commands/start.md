# start — รัน Dev Local (Boonyarit)

## วิธีรันใน VS Code (แนะนำ)

กด `Ctrl+Shift+B` → เลือก **Start Dev**

จะเปิด 3 terminal tab อัตโนมัติใน VS Code:
- **backend** — `npm run dev` (port 3000)
- **frontend** — `npm run dev` (port 5173)
- **ngrok** — `npm run ngrok`

และเปิด browser `http://localhost:5173` อัตโนมัติหลัง 3 วินาที

---

## วิธีรันผ่าน PowerShell (สำรอง)

```powershell
.\start.ps1
```

เปิด 3 terminal แยก window นอก VS Code

---

## ข้อกำหนด

- **Node v24** (จัดการโดย nvm — `start.ps1` เช็คให้อัตโนมัติ)
- **`backend/.env`** — ถ้าไม่มีให้รัน `/creds` ก่อน
- **`node_modules`** — ถ้าไม่มีจะ `npm install` อัตโนมัติ

---

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `.vscode/tasks.json` | VS Code tasks — เปิด terminal ใน VS Code |
| `start.ps1` | PowerShell script — เปิด terminal แยก window |
| `frontend/vite.config.js` | proxy `/api` → `localhost:3000` |

---

## Login

- URL: `http://localhost:5173`
- ถ้าไม่มี account → สมัครที่ `/register-admin` ด้วย `REGISTER_SECRET` จาก `.env`
