# ============================================================
# deploy.ps1 — Build Docker image แล้ว push ขึ้น Docker Hub
# รันสคริปต์นี้ทุกครั้งที่ต้องการ deploy version ใหม่
# ============================================================

# หยุดทันทีถ้ามี error เกิดขึ้น
$ErrorActionPreference = "Stop"

# กำหนดชื่อ image บน Docker Hub
$IMAGE = "veetavee/lineoa"

# สร้าง tag จากวันที่+เวลาปัจจุบัน เช่น 20260619-1430
$TAG = Get-Date -Format "yyyyMMdd-HHmm"

# แสดงข้อความเริ่มต้น
Write-Host "Starting deploy: $IMAGE`:$TAG" -ForegroundColor Cyan

# Step 1: Build Docker image จาก Dockerfile ที่ root
# --build-arg ส่งค่า VITE_API_URL เป็นค่าว่าง เพราะ frontend และ backend อยู่ origin เดียวกัน
Write-Host "[1/3] Building Docker image..." -ForegroundColor Yellow
docker build --build-arg VITE_API_URL="" -t "$IMAGE`:$TAG" -t "$IMAGE`:latest" .

# Step 2: Push ทั้ง 2 tag ขึ้น Docker Hub
Write-Host "[2/3] Pushing to Docker Hub..." -ForegroundColor Yellow
docker push "$IMAGE`:$TAG"
docker push "$IMAGE`:latest"

# Step 3: แสดงคำสั่งที่ต้องรันบน DigitalOcean server
Write-Host "[3/3] Done! Run this on your server:" -ForegroundColor Green
Write-Host ""
Write-Host "  docker-compose pull" -ForegroundColor White
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "Deployed: $IMAGE`:$TAG" -ForegroundColor Green
