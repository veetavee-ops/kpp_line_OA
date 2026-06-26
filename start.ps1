$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$REQUIRED_NODE = "v24"

# Check nvm
$nvmCmd = Get-Command nvm -ErrorAction SilentlyContinue
if (-not $nvmCmd) {
    Write-Host "ERROR: nvm not found. Download: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor Red
    exit 1
}

# Check node
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: node not found. Run: nvm install $REQUIRED_NODE then nvm use $REQUIRED_NODE" -ForegroundColor Red
    exit 1
}

# Check version
if (-not $nodeVersion.StartsWith($REQUIRED_NODE)) {
    Write-Host "WARNING: Node $nodeVersion detected, need $REQUIRED_NODE. Switching..." -ForegroundColor Yellow
    nvm use $REQUIRED_NODE
    $nodeVersion = node --version 2>$null
    if (-not $nodeVersion.StartsWith($REQUIRED_NODE)) {
        Write-Host "ERROR: Switch failed. Run: nvm install $REQUIRED_NODE" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Node $nodeVersion OK" -ForegroundColor Green

# Install dependencies if missing
if (-not (Test-Path "$root\backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install --prefix "$root\backend"
}
if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install --prefix "$root\frontend"
}

Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm run dev' -WorkingDirectory "$root\backend"
Start-Sleep -Seconds 3

Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm run dev' -WorkingDirectory "$root\frontend"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm run ngrok' -WorkingDirectory "$root\backend"

Write-Host "Done! Backend:3000 | Frontend:5173 | ngrok ready" -ForegroundColor Green
