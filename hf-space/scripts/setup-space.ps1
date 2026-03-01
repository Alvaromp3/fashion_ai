# Run from repo root: .\hf-space\scripts\setup-space.ps1
# Prereqs: gh auth login, huggingface-cli login (https://huggingface.co/settings/tokens)

$ErrorActionPreference = "Stop"
$REPO = if ($env:GITHUB_REPO) { $env:GITHUB_REPO } else { "Alvaromp3/fashion_ai" }
$TAG = if ($env:MODELS_RELEASE_TAG) { $env:MODELS_RELEASE_TAG } else { "models-v1.0" }
$HF_SPACE_ID = if ($env:HF_SPACE_ID) { $env:HF_SPACE_ID } else { "fashion-ai-ml" }
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HF_SPACE_DIR = Split-Path -Parent $ScriptDir

Write-Host "=== 1. GitHub: check release and assets ===" -ForegroundColor Cyan
gh release view $TAG --repo $REPO
if ($LASTEXITCODE -ne 0) {
    Write-Host "Release $TAG not found. Create it and upload cnn_model_v1.zip + vit_model_v1.zip (or the raw .h5 and .keras)." -ForegroundColor Red
    exit 1
}
Write-Host "Release $TAG exists.`n" -ForegroundColor Green

Write-Host "=== 2. Hugging Face: create Space (docker) ===" -ForegroundColor Cyan
huggingface-cli repo create $HF_SPACE_ID --repo-type space --space_sdk docker --exist-ok
if ($LASTEXITCODE -ne 0) {
    Write-Host "HF create failed. Run: huggingface-cli login" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "=== 3. Upload hf-space files to the Space ===" -ForegroundColor Cyan
huggingface-cli upload $HF_SPACE_ID (Join-Path $HF_SPACE_DIR "app.py") "app.py" --repo-type space
huggingface-cli upload $HF_SPACE_ID (Join-Path $HF_SPACE_DIR "space_app.py") "space_app.py" --repo-type space
huggingface-cli upload $HF_SPACE_ID (Join-Path $HF_SPACE_DIR "requirements.txt") "requirements.txt" --repo-type space
huggingface-cli upload $HF_SPACE_ID (Join-Path $HF_SPACE_DIR "Dockerfile") "Dockerfile" --repo-type space
huggingface-cli upload $HF_SPACE_ID (Join-Path $HF_SPACE_DIR "README.md") "README.md" --repo-type space
$downloadScript = Join-Path $HF_SPACE_DIR "scripts\download_models.sh"
if (Test-Path $downloadScript) {
    huggingface-cli upload $HF_SPACE_ID $downloadScript "scripts/download_models.sh" --repo-type space
}
Write-Host ""

Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Space: https://huggingface.co/spaces/YOUR_USER/$HF_SPACE_ID"
Write-Host "Set backend ML_SERVICE_URL to that URL (no trailing slash). First build may take 10-15 min."
