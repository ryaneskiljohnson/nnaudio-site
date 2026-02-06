#!/bin/bash

# Update package repositories
echo "Updating package repositories..."
sudo apt update
sudo apt upgrade -y

# Install prerequisites
echo "Installing prerequisites..."
sudo apt install -y curl git build-essential

# Install nvm (Node Version Manager)
echo "Installing nvm..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Load nvm without restarting the terminal
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install latest LTS version of Node.js
echo "Installing latest Node.js LTS version..."
nvm install --lts
nvm use --lts

# Verify Node.js and npm installation
echo "Node.js version:"
node -v
echo "npm version:"
npm -v


# Install pm2 globally
echo "Installing pm2 globally..."
npm install -g pm2

# Verify pm2 installation
echo "PM2 version:"
pm2 -v

# Install bun globally
echo "Installing bun globally..."
npm install -g bun

# Verify bun installation
echo "Bun version:"
bun --version

echo "Server initialization complete!" 