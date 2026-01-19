#!/bin/bash

# YouTube Channel Scraper - VPS Setup Script

echo "🚀 Starting VPS Setup..."

# 1. Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js is already installed"
fi

# 2. Install Git if not present
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get install -y git
fi

# Pull latest changes from GitHub
echo "⬇️ Pulling latest code..."
git pull origin main

# 3. Install Puppeteer System Dependencies (Critical for headless Chrome on Linux)
echo "📦 Installing Chrome dependencies..."
sudo apt-get install -y ca-certificates fonts-liberation libasound2 \
    libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 \
    libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release \
    wget xdg-utils

# 4. Install Project Dependencies
echo "📦 Installing NPM dependencies..."
npm install

# 5. Install PM2 globally for 24/7 execution
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# 6. Start the scraper with PM2
echo "🚀 Starting Scraper with PM2..."
# Check if it's already running to avoid duplicates
if pm2 list | grep -q "yt-scraper"; then
    echo "🔄 Restarting existing process..."
    pm2 restart yt-scraper
else
    echo "▶️ Starting new process..."
    pm2 start sheets-scraper.js --name "yt-scraper"
fi

# 7. Save PM2 list so it starts on reboot
pm2 save

echo "
✅ Setup Complete!
-----------------------------------------------------
The scraper is now running in the background.
View logs:       pm2 logs yt-scraper
Check status:    pm2 status
Restart scraper: pm2 restart yt-scraper
Stop scraper:    pm2 stop yt-scraper
-----------------------------------------------------
"
