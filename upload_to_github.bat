@echo off

rem GitHub upload script
rem Usage:
rem 1. Create a GitHub repo named "学情生成器"
rem 2. Run this script
rem 3. Enter your GitHub username and Personal Access Token

echo ========================================
echo GitHub Upload Script
echo Repo Name: 学情生成器
echo GitHub Username: chengzi6666
echo Repo URL: https://github.com/chengzi6666/学情生成器.git
echo ========================================

rem Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Git is not installed
    echo Download: https://git-scm.com/downloads
    pause
    exit /b 1
)

echo Initializing Git repository...
git init

echo Setting remote repository...
git remote add origin https://github.com/chengzi6666/学情生成器.git

echo Adding all files...
git add .

echo Committing files...
git commit -m "Initial commit: Upload complete project"

echo Pushing to GitHub...
echo Please enter your GitHub username: chengzi6666
echo Please enter your Personal Access Token: (ghp_...)
git push -u origin main

echo ========================================
echo Upload completed!
echo Repo URL: https://github.com/chengzi6666/学情生成器.git
echo Share this link to others
echo ========================================
pause