# Create the Fashion AI R2 bucket using Wrangler (Cloudflare CLI).
# Run from repo root. First time: npx wrangler login
# R2 API tokens (for backend S3 access) must be created in Cloudflare Dashboard.

$bucket = "fashion-ai-uploads"
Write-Host "Creating R2 bucket: $bucket" -ForegroundColor Cyan
& npx --yes wrangler r2 bucket create $bucket
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed. Run: npx wrangler login" -ForegroundColor Yellow
    exit 1
}
Write-Host "Bucket created. Next steps:" -ForegroundColor Green
Write-Host "1. Dashboard -> R2 -> Manage R2 API Tokens -> Create API token"
Write-Host "   Name: fashion-ai, Permission: Object Read & Write, Bucket: $bucket"
Write-Host "2. Copy Access Key ID and Secret Access Key into backend env (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)"
Write-Host "3. Bucket -> Settings -> enable Public access if you need public image URLs; set R2_PUBLIC_URL in backend"
