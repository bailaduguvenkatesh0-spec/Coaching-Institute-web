@echo off
:: Run this as Administrator to allow local Wi-Fi devices (phones, tablets, laptops) to access the app
echo ======================================================
echo   CONFIGURING WINDOWS FIREWALL FOR TEAM B PLATFORM
echo ======================================================
echo.
echo Adding firewall rules for Port 5173 (Frontend) and Port 4000 (Backend)...
netsh advfirewall firewall add rule name="TEAM B Frontend (Port 5173)" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="TEAM B Backend (Port 4000)" dir=in action=allow protocol=TCP localport=4000
echo.
echo Firewall rules successfully configured!
pause
