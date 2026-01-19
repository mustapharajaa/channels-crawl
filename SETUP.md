# Google Sheets YouTube Scraper - Setup Instructions

## Step 1: Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click Enable

4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Enter a name (e.g., "YouTube Scraper")
   - Click "Create and Continue"
   - Skip the optional steps
   - Click "Done"

5. Create a Key:
   - Click on the service account you just created
   - Go to the "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Select "JSON"
   - Click "Create"
   - **A JSON file will be downloaded - this is your credentials file**

6. **IMPORTANT**: Copy the service account email (looks like: `your-app@project-id.iam.gserviceaccount.com`)

## Step 2: Share Your Google Sheet

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1qE9i8KQGrYDX9SbcNubWSvU9fFhzNaDWvve0t-Z2Ob8/edit
2. Click the "Share" button
3. Paste the service account email you copied
4. Give it "Editor" permissions
5. Click "Send"

## Step 3: Save the Credentials

1. Rename the downloaded JSON file to `credentials.json`
2. Move it to: `c:\Users\rajam\yt-crawl\credentials.json`

## Step 4: Run the Scraper

```bash
node sheets-scraper.js
```

The scraper will:
- Read YouTube channel links from column G
- Scrape subscriber counts and views
- Write subscribers to column H
- Write views to column I
