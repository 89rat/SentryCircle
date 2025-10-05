#!/bin/bash

echo "==================================================="
echo "SentryCircle - Full Stack Setup Script"
echo "==================================================="
echo

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Please install Git and try again."
    echo "For Ubuntu/Debian: sudo apt install git"
    echo "For macOS: brew install git"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js and try again."
    echo "For Ubuntu/Debian: sudo apt install nodejs npm"
    echo "For macOS: brew install node"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install Node.js (includes npm) and try again."
    exit 1
fi

echo "All prerequisites are installed. Proceeding with setup..."
echo

# Create project directory if it doesn't exist
if [ ! -d "SentryCircle" ]; then
    echo "Creating project directory..."
    mkdir -p SentryCircle
fi

cd SentryCircle

# Clone the repository if it doesn't exist
if [ ! -d ".git" ]; then
    echo "Cloning SentryCircle repository..."
    git clone https://github.com/89rat/SentryCircle.git .
    if [ $? -ne 0 ]; then
        echo "Failed to clone repository."
        exit 1
    fi
else
    echo "Repository already exists. Pulling latest changes..."
    git pull
fi

echo
echo "==================================================="
echo "Setting up Cloudflare Worker Backend"
echo "==================================================="
echo

# Install Wrangler CLI globally
echo "Installing Wrangler CLI..."
npm install -g wrangler
if [ $? -ne 0 ]; then
    echo "Failed to install Wrangler CLI."
    exit 1
fi

# Navigate to cloudflare-worker directory
cd cloudflare-worker

# Check if wrangler.toml exists and has been configured
if [ ! -f "wrangler.toml.configured" ]; then
    echo
    echo "==================================================="
    echo "Cloudflare Worker Configuration"
    echo "==================================================="
    echo
    echo "You need to configure your Cloudflare Worker before deployment."
    echo
    
    # Prompt for Cloudflare account details
    read -p "Enter your Cloudflare Account ID: " CF_ACCOUNT_ID
    read -p "Enter your KV Namespace ID (or press Enter to create one): " CF_KV_NAMESPACE
    
    # Create a new KV namespace if not provided
    if [ -z "$CF_KV_NAMESPACE" ]; then
        echo "Creating new KV namespace..."
        CF_KV_NAMESPACE_OUTPUT=$(wrangler kv:namespace create SENTRYCIRCLE_KV)
        echo "$CF_KV_NAMESPACE_OUTPUT"
        CF_KV_NAMESPACE=$(echo "$CF_KV_NAMESPACE_OUTPUT" | grep -oP 'id = "\K[^"]+')
        echo "Created KV namespace with ID: $CF_KV_NAMESPACE"
    fi
    
    # Update wrangler.toml with the provided values
    echo "Updating wrangler.toml with your configuration..."
    sed -i "s/YOUR_KV_NAMESPACE_ID_HERE/$CF_KV_NAMESPACE/g" wrangler.toml
    
    # Create JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    echo "Generated JWT secret: $JWT_SECRET"
    
    # Mark as configured
    cp wrangler.toml wrangler.toml.configured
    
    echo "Cloudflare Worker configuration complete."
fi

echo
echo "==================================================="
echo "Setting up JWT Secret"
echo "==================================================="
echo

# Set JWT secret
echo "Setting JWT secret..."
echo "This will be used to secure your API tokens."
read -p "Enter a JWT secret (or press Enter to generate one): " JWT_SECRET

# Generate a random JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo "Generated JWT secret: $JWT_SECRET"
fi

# Store JWT secret for wrangler
echo "$JWT_SECRET" > jwt_secret.txt
echo "JWT secret saved to jwt_secret.txt"

echo
echo "==================================================="
echo "Setting up Mobile App"
echo "==================================================="
echo

# Navigate to mobile-app directory
cd ..
cd mobile-app

# Install dependencies
echo "Installing mobile app dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install mobile app dependencies."
    exit 1
fi

# Create .env file for the mobile app
echo "Creating .env file for the mobile app..."
echo "API_URL=https://sentrycircle-api.your-username.workers.dev" > .env
echo "JWT_SECRET=$JWT_SECRET" >> .env

echo "Mobile app setup complete."

echo
echo "==================================================="
echo "Setting up Web Dashboard"
echo "==================================================="
echo

# Create web-dashboard directory if it doesn't exist
cd ..
if [ ! -d "web-dashboard" ]; then
    echo "Creating web dashboard directory..."
    mkdir -p web-dashboard
    cd web-dashboard
    
    # Initialize React app
    echo "Initializing React app for web dashboard..."
    npx create-react-app . --template typescript
    if [ $? -ne 0 ]; then
        echo "Failed to initialize React app."
        exit 1
    fi
    
    # Install additional dependencies
    echo "Installing additional dependencies for web dashboard..."
    npm install react-router-dom axios @mantine/core @mantine/hooks @emotion/react leaflet react-leaflet @tanstack/react-query
    if [ $? -ne 0 ]; then
        echo "Failed to install additional dependencies."
        exit 1
    fi
    
    # Create .env file for the web dashboard
    echo "Creating .env file for the web dashboard..."
    echo "REACT_APP_API_URL=https://sentrycircle-api.your-username.workers.dev" > .env
else
    cd web-dashboard
    echo "Web dashboard directory already exists. Installing dependencies..."
    npm install
fi

echo "Web dashboard setup complete."

cd ..

echo
echo "==================================================="
echo "Setup Complete!"
echo "==================================================="
echo
echo "Next steps:"
echo "1. Deploy your Cloudflare Worker:"
echo "   cd cloudflare-worker"
echo "   wrangler login"
echo "   wrangler publish"
echo
echo "2. Update the API URLs in .env files with your actual Cloudflare Worker URL"
echo
echo "3. Run the web dashboard:"
echo "   cd web-dashboard"
echo "   npm start"
echo
echo "4. Run the mobile app:"
echo "   cd mobile-app"
echo "   npx react-native run-android"
echo "   or"
echo "   npx react-native run-ios"
echo

read -p "Press Enter to continue..."
