const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Helper function to wait/sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Wait for the page to load
    await sleep(5000); // Wait 5 seconds for page to fully load

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

async function main() {
  console.log('🚀 YouTube Channel Scraper Starting...\n');

  // Read channels from JSON file
  const channelsPath = path.join(__dirname, 'channels.json');

  if (!fs.existsSync(channelsPath)) {
    console.error('❌ channels.json file not found!');
    console.log('Please create a channels.json file with the following format:');
    console.log(JSON.stringify({
      channels: [
        "https://www.youtube.com/@ChannelName1",
        "https://www.youtube.com/@ChannelName2"
      ]
    }, null, 2));
    return;
  }

  const data = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
  const channels = data.channels || [];

  if (channels.length === 0) {
    console.error('❌ No channels found in channels.json');
    return;
  }

  console.log(`📋 Found ${channels.length} channel(s) to scrape\n`);

  // Launch browser with Windows-friendly settings
  const browser = await puppeteer.launch({
    headless: false,  // Set to false to see the browser
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ],
    timeout: 60000,
    ignoreDefaultArgs: ['--enable-automation']
  });

  const results = [];

  // Scrape each channel
  for (const channelUrl of channels) {
    const result = await scrapeChannel(browser, channelUrl);
    results.push(result);
  }

  // Close browser with error handling
  try {
    await browser.close();
  } catch (error) {
    console.warn('⚠️  Warning: Error closing browser:', error.message);
  }

  // Save results to file
  const resultsPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log('\n\n📊 === SCRAPING COMPLETE ===');
  console.log(`\n📁 Results saved to: ${resultsPath}\n`);

  // Print summary table
  console.log('📈 Summary:');
  console.log('─'.repeat(80));
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.channelName}`);
    console.log(`   URL: ${result.channelUrl}`);
    console.log(`   Subscribers: ${result.subscriberCount}`);
    console.log(`   Total Views: ${result.totalViews}`);
    if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}`);
    }
    console.log('─'.repeat(80));
  });
}

main().catch(console.error);
