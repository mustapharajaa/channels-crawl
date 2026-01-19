# YouTube Channel Scraper

A robust, 24/7 YouTube channel scraper that monitors subscriber counts and total views, fully integrated with Google Sheets.

## Features

- **Google Sheets Integration**: Reads URLs from Column C, writes Views to Column D, and Subscribers to Column E.
- **24/7 Scheduling**: Runs continuously in the background using `pm2`.
- **Daily Scrapes**: Checks channels once every 24 hours.
- **Randomized Start Time**: Wakes up at midnight but waits a random 0-24 hour delay before scraping.
- **Randomized Order**: Shuffles the channel list every run to mimic human behavior.

## VPS Deployment Guide (Full Steps)

Follow these steps to deploy the scraper on your VPS (`46.62.251.155`).

### 1. Connect to VPS
Open your terminal and run:
```bash
ssh root@46.62.251.155
```

### 2. Install & Setup
Run these commands inside your VPS:
```bash
# Clone the repository
git clone https://github.com/mustapharajaa/channels-crawl.git

# Enter the directory
cd channels-crawl

# Run the setup script (installs Node.js, libraries, PM2)
bash vps-setup.sh
```

### 3. Upload Credentials (Manual Method)
Since `credentials.json` is secret, it's not on GitHub. You must create it manually on the VPS.

1.  **On your computer**: Open `credentials.json` and copy all the text.
2.  **On the VPS**: Run this command:
    ```bash
    nano credentials.json
    ```
3.  **Paste** the text (Right-click usually pastes).
4.  **Save & Exit**:
    - Press `Ctrl + X`
    - Press `Y`
    - Press `Enter`

### 4. Restart the Scraper
Once the credentials are saved, restart the scraper to pick them up:
```bash
pm2 restart yt-scraper
```

## Maintenance Commands

- **View Logs**: `pm2 logs yt-scraper`
- **Check Status**: `pm2 status`
- **Stop Scraper**: `pm2 stop yt-scraper`
- **Update Code**:
  ```bash
  cd ~/channels-crawl
  bash vps-setup.sh
  ```
