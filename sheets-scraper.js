const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Helper function to wait/sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to shuffle array (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Google Sheets configuration
const SPREADSHEET_ID = '1f6XtCLvRVKHmRH_a27672TT2cQIi2fE1fpnTLzxmGhs';
const SHEET_NAME = 'Sheet1'; // Change this if your sheet has a different name
const CHANNEL_COLUMN = 'C'; // Column with YouTube channel URLs
const SUBS_COLUMN = 'E';    // Column to write subscriber counts
const VIEWS_COLUMN = 'D';   // Column to write view counts

async function scrapeChannel(browser, channelUrl) {
    const page = await browser.newPage();

    try {
        console.log(`\n🔍 Scraping: ${channelUrl}`);

        // Go directly to the About page where all the data is available
        const aboutUrl = channelUrl.endsWith('/')
            ? `${channelUrl}about`
            : `${channelUrl}/about`;

        await page.goto(aboutUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Check for and handle Cookie Consent Popup (Common on VPS IPs)
        try {
            const consentButton = await page.$('button[aria-label="Accept all"]');
            if (consentButton) {
                console.log('🍪 Found consent popup, clicking "Accept all"...');
                await consentButton.click();
                await sleep(3000); // Wait for popup to clear
            }
        } catch (e) {
            // Ignore if no consent popup
        }

        // Wait for key elements to ensure page is loaded
        try {
            await page.waitForSelector('ytd-channel-name', { timeout: 10000 });
        } catch (e) {
            console.log('⚠️ Could not find channel name element - taking debug screenshot...');
            await page.screenshot({ path: path.join(__dirname, 'debug-error.png') });
        }

        // Wait a bit more for dynamic content
        await sleep(5000);

        // Extract channel name

        const channelName = await page.evaluate(() => {
            const nameElement = document.querySelector('yt-formatted-string.ytd-channel-name');
            return nameElement ? nameElement.textContent.trim() : 'Unknown';
        });

        // Extract both subscriber count and views from the About page table
        const stats = await page.evaluate(() => {
            const rows = document.querySelectorAll('tr.description-item');
            let subscribers = 'Not found';
            let views = 'Not found';

            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const text = cells[1].textContent.trim();
                    if (text.includes('subscriber')) {
                        subscribers = text;
                    } else if (text.includes('views')) {
                        views = text;
                    }
                }
            }

            return { subscribers, views };
        });

        const result = {
            channelUrl,
            channelName,
            subscriberCount: stats.subscribers,
            totalViews: stats.views
        };

        console.log(`✅ Channel: ${channelName}`);
        console.log(`   Subscribers: ${stats.subscribers}`);
        console.log(`   Total Views: ${stats.views}`);

        return result;

    } catch (error) {
        console.error(`❌ Error scraping ${channelUrl}:`, error.message);

        // Take screenshot on error too
        try {
            await page.screenshot({ path: path.join(__dirname, 'debug-crash.png') });
            console.log('📸 Saved debug-crash.png');
        } catch (e) { }

        return {
            channelUrl,
            channelName: 'Error',
            subscriberCount: 'Error',
            totalViews: 'Error',
            error: error.message
        };
    } finally {
        await page.close();
    }
}

async function authenticateGoogleSheets() {
    const credentialsPath = path.join(__dirname, 'credentials.json');

    if (!fs.existsSync(credentialsPath)) {
        console.error('❌ credentials.json file not found!');
        console.log('\n📖 Please follow the setup instructions in SETUP.md');
        process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
}

async function readChannelsFromSheet(sheets) {
    console.log('📖 Reading channel URLs from Google Sheet...\n');

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!${CHANNEL_COLUMN}:${CHANNEL_COLUMN}`,
    });

    const rows = response.data.values || [];

    // Track both URL and row number
    const channels = [];
    rows.forEach((row, index) => {
        const url = row[0];
        if (url && url.trim() && url.includes('youtube.com')) {
            channels.push({
                url: url.trim(),
                rowNumber: index + 1  // Sheets are 1-indexed
            });
        }
    });

    return channels;
}

async function writeResultsToSheet(sheets, results) {
    console.log('\n💾 Writing results back to Google Sheet...\n');

    // Prepare data for batch update
    const data = [];

    results.forEach((result) => {
        const rowNumber = result.rowNumber; // Use the original row number from the sheet

        // Add subscriber count to the same row in column D
        data.push({
            range: `${SHEET_NAME}!${SUBS_COLUMN}${rowNumber}`,
            values: [[result.subscriberCount]],
        });

        // Add view count to the same row in column B
        data.push({
            range: `${SHEET_NAME}!${VIEWS_COLUMN}${rowNumber}`,
            values: [[result.totalViews]],
        });
    });

    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
            valueInputOption: 'RAW',
            data: data,
        },
    });

    console.log('✅ Results written to Google Sheet successfully!');
}

const cron = require('node-cron');

// ... existing code ...

async function runScraper() {
    console.log(`\n⏰ Scheduled Run Started: ${new Date().toLocaleString()}`);
    console.log('🚀 YouTube Channel Scraper (Google Sheets Edition) Starting...\n');

    // Authenticate with Google Sheets
    let sheets;
    try {
        sheets = await authenticateGoogleSheets();
        console.log('✅ Google Sheets authentication successful!\n');
    } catch (error) {
        console.error('❌ Failed to authenticate with Google Sheets:', error.message);
        return;
    }

    // Read channel URLs from the sheet
    let channels;
    try {
        channels = await readChannelsFromSheet(sheets);
        console.log(`📋 Found ${channels.length} channel(s) to scrape\n`);

        if (channels.length === 0) {
            console.log('No channels found in column C. Please add YouTube URLs to column C.');
            return;
        }

        // Randomize the order of channels
        channels = shuffleArray(channels);
        console.log('🎲 Randomized channel order for this run');
    } catch (error) {
        console.error('❌ Failed to read from Google Sheet:', error.message);
        return;
    }



    // ... existing code ...

    // Launch browser
    const browser = await puppeteer.launch({
        // Auto-detect: Headless on Linux (VPS), Visible on Windows
        headless: process.platform === 'linux' ? 'new' : false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled'
        ],
        timeout: 60000,
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();

    // Load cookies if they exist
    const cookiesPath = path.join(__dirname, 'cookies.json');
    if (fs.existsSync(cookiesPath)) {
        try {
            const cookiesString = fs.readFileSync(cookiesPath);
            const cookies = JSON.parse(cookiesString);
            await page.setCookie(...cookies);
            console.log('🍪 Loaded cookies from cookies.json');
        } catch (error) {
            console.error('⚠️ Error loading cookies:', error.message);
        }
    }

    await page.close(); // Close the initial page we opened just to set cookies

    const results = [];

    // Scrape each channel
    for (const channel of channels) {
        const result = await scrapeChannel(browser, channel.url);
        // Preserve the row number from the sheet
        result.rowNumber = channel.rowNumber;
        results.push(result);
    }

    // Close browser with error handling
    try {
        await browser.close();
    } catch (error) {
        console.warn('⚠️  Warning: Error closing browser:', error.message);
    }

    // Write results back to the sheet
    try {
        await writeResultsToSheet(sheets, results);
    } catch (error) {
        console.error('❌ Failed to write results to Google Sheet:', error.message);
    }

    // Also save results to local JSON file as backup
    const resultsPath = path.join(__dirname, 'results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    console.log('\n\n📊 === SCRAPING COMPLETE ===');
    console.log(`⏰ Scheduled Run Finished: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(80));
}

function main() {
    console.log('🔄 YouTube Scraper Scheduler Application Started');
    console.log('📅 Schedule: Runs every day at 12:00 AM (Midnight)');
    console.log('👉 Press Ctrl+C to stop the application');
    console.log('─'.repeat(80));

    // Run immediately on startup
    runScraper().catch(console.error);

    // Schedule to check every day at midnight (0 0 * * *)
    // But then wait a random amount of time (0-24 hours) before actually running
    cron.schedule('0 0 * * *', () => {
        const randomDelayHours = Math.random() * 24;
        const randomDelayMs = Math.floor(randomDelayHours * 60 * 60 * 1000);

        const nextRunTime = new Date(Date.now() + randomDelayMs);

        console.log(`\n🎲 Daily Schedule Triggered: Randomizing start time...`);
        console.log(`⏳ Waiting ${randomDelayHours.toFixed(2)} hours`);
        console.log(`📅 Next scrape will run at: ${nextRunTime.toLocaleString()}`);
        console.log('─'.repeat(80));

        setTimeout(() => {
            runScraper().catch(console.error);
        }, randomDelayMs);
    });
}

main();
