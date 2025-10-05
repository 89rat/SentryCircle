#!/bin/bash

echo "==================================================="
echo "SentryCircle - Setup Test Script"
echo "==================================================="
echo

# Create a temporary directory for testing
echo "Creating temporary test directory..."
mkdir -p test_temp
cd test_temp

# Test Git functionality
echo "Testing Git functionality..."
if ! command -v git &> /dev/null; then
    echo "[FAIL] Git is not installed."
else
    echo "[PASS] Git is installed and in PATH."
    echo "Git version: $(git --version)"
fi

# Test Node.js functionality
echo "Testing Node.js functionality..."
if ! command -v node &> /dev/null; then
    echo "[FAIL] Node.js is not installed."
else
    echo "[PASS] Node.js is installed and in PATH."
    echo "Node.js version: $(node --version)"
fi

# Test npm functionality
echo "Testing npm functionality..."
if ! command -v npm &> /dev/null; then
    echo "[FAIL] npm is not installed."
else
    echo "[PASS] npm is installed and in PATH."
    echo "npm version: $(npm --version)"
fi

# Test Wrangler installation
echo "Testing Wrangler installation..."
if ! command -v wrangler &> /dev/null; then
    echo "[INFO] Wrangler is not installed globally. This is expected if you haven't run setup.sh yet."
else
    echo "[PASS] Wrangler is installed globally."
    echo "Wrangler version: $(wrangler --version)"
fi

# Test file creation
echo "Testing file creation..."
echo "Test content" > test_file.txt
if [ -f test_file.txt ]; then
    echo "[PASS] File creation successful."
else
    echo "[FAIL] Failed to create test file."
fi

# Test environment variable handling
echo "Testing environment variable handling..."
export TEST_VAR="test_value"
if [ "$TEST_VAR" = "test_value" ]; then
    echo "[PASS] Environment variable handling works."
else
    echo "[FAIL] Environment variable handling failed."
fi

# Test JSON parsing
echo "Testing JSON parsing..."
echo '{"test": "value"}' > test.json
JSON_CONTENT=$(cat test.json)
if [ "$JSON_CONTENT" = '{"test": "value"}' ]; then
    echo "[PASS] JSON file handling works."
else
    echo "[FAIL] JSON file handling failed."
fi

# Test directory creation
echo "Testing directory structure creation..."
mkdir -p test_dir/subdir
if [ -d test_dir/subdir ]; then
    echo "[PASS] Directory structure creation works."
else
    echo "[FAIL] Directory structure creation failed."
fi

# Test OpenSSL for JWT secret generation
echo "Testing OpenSSL for JWT secret generation..."
if ! command -v openssl &> /dev/null; then
    echo "[WARN] OpenSSL is not installed. JWT secret generation may not work."
else
    echo "[PASS] OpenSSL is installed."
    JWT_SECRET=$(openssl rand -hex 32)
    echo "Generated JWT secret: $JWT_SECRET"
fi

# Clean up
echo "Cleaning up test files..."
cd ..
rm -rf test_temp

echo
echo "==================================================="
echo "Test Results Summary"
echo "==================================================="
echo
echo "The test script has verified the basic functionality"
echo "required for the setup.sh script to run correctly."
echo
echo "If all tests passed, you can run setup.sh to set up"
echo "the SentryCircle application."
echo
echo "If any tests failed, please address the issues before"
echo "running setup.sh."
echo

read -p "Press Enter to continue..."
