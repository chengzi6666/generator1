# 上传到 GitHub 的脚本
# 使用方法：
# 1. 在 GitHub 网站上创建名为 "学情生成器" 的公开仓库
# 2. 运行此脚本
# 3. 输入你的 GitHub 用户名和密码（或 token）

# 设置仓库信息
$repoName = "学情生成器"
$username = "chengzi6666"
$repoUrl = "https://github.com/$username/$repoName.git"

Write-Host "========================================"
Write-Host "上传到 GitHub 脚本"
Write-Host "仓库名称: $repoName"
Write-Host "GitHub 用户名: $username"
Write-Host "仓库地址: $repoUrl"
Write-Host "========================================"

# 检查 Git 是否安装
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "错误: Git 未安装，请先安装 Git"
    Write-Host "下载地址: https://git-scm.com/downloads"
    pause
    exit 1
}

Write-Host "正在初始化 Git 仓库..."
git init

Write-Host "正在设置远程仓库..."
git remote add origin $repoUrl

Write-Host "正在添加所有文件..."
git add .

Write-Host "正在提交文件..."
git commit -m "初始提交: 上传完整项目"

Write-Host "正在推送到 GitHub..."
Write-Host "提示: 请输入你的 GitHub 用户名和 Personal Access Token"
Write-Host "Token 格式: ghp_..."
git push -u origin main

Write-Host "========================================"
Write-Host "上传完成！"
Write-Host "仓库地址: $repoUrl"
Write-Host "可以分享此链接给他人访问你的代码"
Write-Host "========================================"
pause