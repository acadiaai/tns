const { chromium } = require('playwright');

async function takeScreenshot() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'homepage_screenshot.png', fullPage: true });
    
    console.log('Screenshot saved as homepage_screenshot.png');
    
    // Get page title and some basic info
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Get the page content for analysis
    const content = await page.content();
    console.log('Page loaded successfully');
    
  } catch (error) {
    console.error('Error taking screenshot:', error.message);
  } finally {
    await browser.close();
  }
}

takeScreenshot();