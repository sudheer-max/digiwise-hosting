@echo off
REM DigiWise Hosting - Windows Deployment Script
REM This script uploads files to the server and runs deployment

set SERVER=root@172.105.49.201
set DEPLOY_DIR=/root/digiwise-hosting

echo ==========================================
echo DigiWise Hosting Deployment
echo ==========================================
echo.

echo Step 1: Creating deployment directory on server...
ssh -o StrictHostKeyChecking=no %SERVER% "mkdir -p %DEPLOY_DIR%"

echo.
echo Step 2: Uploading files...
scp -r docker-compose.yml %SERVER%:%DEPLOY_DIR%/
scp -r nginx %SERVER%:%DEPLOY_DIR%/
scp -r backend %SERVER%:%DEPLOY_DIR%/
scp -r frontend %SERVER%:%DEPLOY_DIR%/
scp deploy-server.sh %SERVER%:%DEPLOY_DIR%/

echo.
echo Step 3: Running deployment on server...
ssh -o StrictHostKeyChecking=no %SERVER% "cd %DEPLOY_DIR% && chmod +x deploy-server.sh && bash deploy-server.sh"

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Frontend: http://172.105.49.201
echo Backend API: http://172.105.49.201/api/
echo.
pause
