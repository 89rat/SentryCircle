@echo off
SETLOCAL EnableDelayedExpansion

echo ===================================================
echo SentryCircle - Setup Test Script
echo ===================================================
echo.

:: Create a temporary directory for testing
echo Creating temporary test directory...
mkdir test_temp
cd test_temp

:: Test Git functionality
echo Testing Git functionality...
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Git is not installed or not in PATH.
) else (
    echo [PASS] Git is installed and in PATH.
)

:: Test Node.js functionality
echo Testing Node.js functionality...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Node.js is not installed or not in PATH.
) else (
    echo [PASS] Node.js is installed and in PATH.
    
    :: Test Node.js version
    for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
    echo Node.js version: !NODE_VERSION!
)

:: Test npm functionality
echo Testing npm functionality...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] npm is not installed or not in PATH.
) else (
    echo [PASS] npm is installed and in PATH.
    
    :: Test npm version
    for /f "tokens=*" %%a in ('npm --version') do set NPM_VERSION=%%a
    echo npm version: !NPM_VERSION!
)

:: Test Wrangler installation
echo Testing Wrangler installation...
npm list -g wrangler >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Wrangler is not installed globally. This is expected if you haven't run setup.bat yet.
) else (
    echo [PASS] Wrangler is installed globally.
)

:: Test file creation
echo Testing file creation...
echo Test content > test_file.txt
if exist test_file.txt (
    echo [PASS] File creation successful.
) else (
    echo [FAIL] Failed to create test file.
)

:: Test environment variable handling
echo Testing environment variable handling...
set TEST_VAR=test_value
if "!TEST_VAR!"=="test_value" (
    echo [PASS] Environment variable handling works.
) else (
    echo [FAIL] Environment variable handling failed.
)

:: Test JSON parsing
echo Testing JSON parsing...
echo {"test": "value"} > test.json
for /f "tokens=*" %%a in ('type test.json') do set JSON_CONTENT=%%a
if "!JSON_CONTENT!"=="{\"test\": \"value\"}" (
    echo [PASS] JSON file handling works.
) else (
    echo [FAIL] JSON file handling failed.
)

:: Test directory creation
echo Testing directory structure creation...
mkdir -p test_dir/subdir
if exist test_dir\subdir (
    echo [PASS] Directory structure creation works.
) else (
    echo [FAIL] Directory structure creation failed.
)

:: Clean up
echo Cleaning up test files...
cd ..
rmdir /s /q test_temp

echo.
echo ===================================================
echo Test Results Summary
echo ===================================================
echo.
echo The test script has verified the basic functionality
echo required for the setup.bat script to run correctly.
echo.
echo If all tests passed, you can run setup.bat to set up
echo the SentryCircle application.
echo.
echo If any tests failed, please address the issues before
echo running setup.bat.
echo.

pause
