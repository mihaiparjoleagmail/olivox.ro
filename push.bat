@echo off
setlocal
cd /d E:\olivox

echo.
echo  ========================================
echo   olivox.ro - Push to GitHub
echo  ========================================
echo.

set "MSG=%*"
if "%MSG%"=="" set "MSG=Update"

echo  [*] Adaugare fisiere...
git add -A

echo  [*] Commit: %MSG%
git commit -m "%MSG%"

echo  [*] Push la GitHub (mihai2025/olivox)...
git push origin main

echo.
echo  ========================================
echo   GATA! Vercel va face deploy automat.
echo  ========================================
pause
