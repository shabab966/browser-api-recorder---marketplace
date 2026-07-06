const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Enable stealth bypass plugins
puppeteer.use(StealthPlugin());

async function run() {
  console.log("🚀 Launching local Puppeteer Stealth Browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security'
    ]
  });
  
  const page = await browser.newPage();
  
  console.log("🌍 Navigating to Hacker News (https://news.ycombinator.com)...");
  await page.goto("https://news.ycombinator.com", { waitUntil: "networkidle2" });
  
  console.log("🔍 Extracting top 5 article headlines...");
  const headlines = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.titleline > a');
    return Array.from(nodes).slice(0, 5).map(el => el.textContent.trim());
  });
  
  console.log("\n📦 Scraped Results:");
  headlines.forEach((title, idx) => {
    console.log(`${idx + 1}. ${title}`);
  });
  
  await browser.close();
  console.log("\n✅ Done!");
}

run().catch(err => {
  console.error("❌ Scraper crashed:", err.message);
});
