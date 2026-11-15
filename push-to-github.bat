@echo off
title Push TEAM B Codebase to GitHub
echo ======================================================
echo   PUSHING COMPLETE REPOSITORY TO GITHUB
echo ======================================================
echo.
echo Remote: https://github.com/bailaduguvenkatesh0-spec/Coaching-Institute-web.git
echo Branch: main
echo.
git -c http.sslBackend=openssl push -u origin main --force
echo.
echo ======================================================
echo Finished! Check the output above. If pushed successfully, Vercel will now auto-redeploy.
echo ======================================================
pause
