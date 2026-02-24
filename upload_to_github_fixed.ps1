# GitHub upload script
# Usage:
# 1. Create a GitHub repo named "学情生成器"
# 2. Run this script
# 3. Enter your GitHub username and Personal Access Token

# Repository settings
$repoName = "学情生成器"
$username = "chengzi6666"
$repoUrl = "https://github.com/$username/$repoName.git"

Write-Host "========================================"
Write-Host "GitHub Upload Script"
Write-Host "Repo Name: $repoName"
Write-Host "GitHub Username: $username"
Write-Host "Repo URL: $repoUrl"
Write-Host "========================================"

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Git is not installed"
    Write-Host "Download: https://git-scm.com/downloads"
    pause
    exit 1
}

Write-Host "Initializing Git repository..."
git init

Write-Host "Setting remote repository..."
git remote add origin $repoUrl

Write-Host "Adding all files..."
git add .

Write-Host "Committing files..."
git commit -m "Initial commit: Upload complete project"

Write-Host "Pushing to GitHub..."
Write-Host "Please enter your GitHub username:"
Write-Host "Username: $username"
Write-Host "Please enter your Personal Access Token:"
Write-Host "Token format: ghp_..."
git push -u origin main

Write-Host "========================================"
Write-Host "Upload completed!"
Write-Host "Repo URL: $repoUrl"
Write-Host "Share this link to others"
Write-Host "========================================"
pause