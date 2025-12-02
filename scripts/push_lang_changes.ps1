Param()
$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot\.."
git status --porcelain=v1
git add src/api/detect.js README.md .env.example
git commit -m "feat(i18n): soporte bilingüe en detect/search vía ?lang=en|es; docs/env actualizados"
$branch = git rev-parse --abbrev-ref HEAD
git push origin $branch
Write-Output ("Pushed to origin/" + $branch)
git log origin/$branch -n 1 --oneline