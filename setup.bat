@echo off
SETLOCAL EnableDelayedExpansion

echo ===================================================
echo SentryCircle - Full Stack Setup Script
echo ===================================================
echo.

:: Check if Git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Git is not installed or not in PATH. Please install Git and try again.
    echo Download Git from: https://git-scm.com/downloads
    pause
    exit /b 1
)

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed or not in PATH. Please install Node.js and try again.
    echo Download Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo npm is not installed or not in PATH. Please install Node.js (includes npm) and try again.
    pause
    exit /b 1
)

echo All prerequisites are installed. Proceeding with setup...
echo.

:: Create project directory if it doesn't exist
if not exist SentryCircle (
    echo Creating project directory...
    mkdir SentryCircle
)

cd SentryCircle

:: Clone the repository if it doesn't exist
if not exist .git (
    echo Cloning SentryCircle repository...
    git clone https://github.com/89rat/SentryCircle.git .
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to clone repository.
        pause
        exit /b 1
    )
) else (
    echo Repository already exists. Pulling latest changes...
    git pull
)

echo.
echo ===================================================
echo Setting up Cloudflare Worker Backend
echo ===================================================
echo.

:: Install Wrangler CLI globally
echo Installing Wrangler CLI...
call npm install -g wrangler
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install Wrangler CLI.
    pause
    exit /b 1
)

:: Navigate to cloudflare-worker directory
cd cloudflare-worker

:: Check if wrangler.toml exists and has been configured
if not exist wrangler.toml.configured (
    echo.
    echo ===================================================
    echo Cloudflare Worker Configuration
    echo ===================================================
    echo.
    echo You need to configure your Cloudflare Worker before deployment.
    echo.
    
    :: Prompt for Cloudflare account details
    set /p CF_ACCOUNT_ID="Enter your Cloudflare Account ID: "
    set /p CF_KV_NAMESPACE="Enter your KV Namespace ID (or press Enter to create one): "
    
    :: Create a new KV namespace if not provided
    if "!CF_KV_NAMESPACE!"=="" (
        echo Creating new KV namespace...
        for /f "tokens=*" %%a in ('wrangler kv:namespace create SENTRYCIRCLE_KV') do set CF_KV_NAMESPACE_OUTPUT=%%a
        echo !CF_KV_NAMESPACE_OUTPUT!
        for /f "tokens=3" %%a in ("!CF_KV_NAMESPACE_OUTPUT!") do set CF_KV_NAMESPACE=%%a
        echo Created KV namespace with ID: !CF_KV_NAMESPACE!
    )
    
    :: Update wrangler.toml with the provided values
    echo Updating wrangler.toml with your configuration...
    powershell -Command "(Get-Content wrangler.toml) -replace 'YOUR_KV_NAMESPACE_ID_HERE', '!CF_KV_NAMESPACE!' | Set-Content wrangler.toml"
    
    :: Create JWT secret
    set JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
    echo Generated JWT secret: !JWT_SECRET!
    
    :: Mark as configured
    copy wrangler.toml wrangler.toml.configured
    
    echo Cloudflare Worker configuration complete.
)

echo.
echo ===================================================
echo Setting up JWT Secret
echo ===================================================
echo.

:: Set JWT secret
echo Setting JWT secret...
echo This will be used to secure your API tokens.
set /p JWT_SECRET="Enter a JWT secret (or press Enter to generate one): "

:: Generate a random JWT secret if not provided
if "!JWT_SECRET!"=="" (
    set JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
    echo Generated JWT secret: !JWT_SECRET!
)

:: Store JWT secret for wrangler
echo !JWT_SECRET! > jwt_secret.txt
echo JWT secret saved to jwt_secret.txt

echo.
echo ===================================================
echo Setting up Mobile App
echo ===================================================
echo.

:: Navigate to mobile-app directory
cd ..
cd mobile-app

:: Install dependencies
echo Installing mobile app dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install mobile app dependencies.
    pause
    exit /b 1
)

:: Create .env file for the mobile app
echo Creating .env file for the mobile app...
echo API_URL=https://sentrycircle-api.your-username.workers.dev > .env
echo JWT_SECRET=!JWT_SECRET! >> .env

echo Mobile app setup complete.

echo.
echo ===================================================
echo Setting up Web Dashboard
echo ===================================================
echo.

:: Create web-dashboard directory if it doesn't exist
cd ..
if not exist web-dashboard (
    echo Creating web dashboard directory...
    mkdir web-dashboard
    cd web-dashboard
    
    :: Initialize React app
    echo Initializing React app for web dashboard...
    call npx create-react-app . --template typescript
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to initialize React app.
        pause
        exit /b 1
    )
    
    :: Install additional dependencies
    echo Installing additional dependencies for web dashboard...
    call npm install react-router-dom axios @mantine/core @mantine/hooks @emotion/react leaflet react-leaflet @tanstack/react-query
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install additional dependencies.
        pause
        exit /b 1
    )
    
    :: Create .env file for the web dashboard
    echo Creating .env file for the web dashboard...
    echo REACT_APP_API_URL=https://sentrycircle-api.your-username.workers.dev > .env
) else (
    cd web-dashboard
    echo Web dashboard directory already exists. Installing dependencies...
    call npm install
)

echo Web dashboard setup complete.

cd ..

echo.
echo ===================================================
echo Setup Complete!
echo ===================================================
echo.
echo Next steps:
echo 1. Deploy your Cloudflare Worker:
echo    cd cloudflare-worker
echo    wrangler login
echo    wrangler publish
echo.
echo 2. Update the API URLs in .env files with your actual Cloudflare Worker URL
echo.
echo 3. Run the web dashboard:
echo    cd web-dashboard
echo    npm start
echo.
echo 4. Run the mobile app:
echo    cd mobile-app
echo    npx react-native run-android
echo    or
echo    npx react-native run-ios
echo.

pause
