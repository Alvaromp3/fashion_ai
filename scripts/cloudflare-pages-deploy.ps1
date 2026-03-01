# Build frontend and deploy to Cloudflare Pages via Wrangler (Direct Upload).
# Run from repo root. First time: npx wrangler login
# Optional: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN for CI.

$ErrorActionPreference = "Stop"
$projectName = "fashion-ai"
$buildDir = "frontend/dist"

Write-Host "Building frontend..." -ForegroundColor Cyan
Push-Location frontend
try {
    npm ci
    npm run build
} finally { Pop-Location }

if (-not (Test-Path $buildDir)) {
    Write-Host "Build output not found: $buildDir" -ForegroundColor Red
    exit 1
}

Write-Host "Deploying to Cloudflare Pages (project: $projectName)..." -ForegroundColor Cyan
& npx --yes wrangler pages deploy $buildDir --project-name $projectName
if ($LASTEXITCODE -ne 0) {
    Write-Host "If project does not exist, create it first: npx wrangler pages project create $projectName" -ForegroundColor Yellow
    exit 1
}
Write-Host "Done. Set Pages env vars (VITE_*) in Dashboard -> Workers & Pages -> $projectName -> Settings -> Environment variables, then redeploy." -ForegroundColor Green
