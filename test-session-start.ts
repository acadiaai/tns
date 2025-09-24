import { chromium, Page, Browser } from 'playwright';

async function testSessionStart(): Promise<void> {
  console.log('🧪 Starting Brainspotting Session Test...');

  const browser: Browser = await chromium.launch({ headless: false });
  const page: Page = await browser.newPage();

  try {
    // Navigate to app
    await page.goto('http://localhost:5173');
    console.log('✅ Navigated to app');

    // Verify backend version
    const version = await page.textContent('text*="Backend:"');
    console.log('✅ Backend version:', version);

    // Create Quick Coach Session
    await page.click('text="🧠 Quick Coach Session"');
    console.log('✅ Clicked Quick Coach Session button');

    // Wait for session page load and verify Pre-Session phase
    await page.waitForSelector('text="Pre-Session"', { timeout: 10000 });
    console.log('✅ Session loaded - Pre-Session phase visible');

    // Wait for initial greeting (casual conversation)
    await page.waitForSelector('[data-testid="coach-message"], .coach-message', { timeout: 10000 });
    const greeting = await page.textContent('[data-testid="coach-message"], .coach-message');
    console.log('✅ Initial greeting received:', greeting);

    // Validate greeting is casual (not therapeutic)
    if (greeting && greeting.toLowerCase().includes('day')) {
      console.log('✅ PASS: Greeting contains casual "day" conversation');
    } else {
      throw new Error('❌ FAIL: Greeting is not casual conversation');
    }

    // STAGE 1: Start casual conversation
    const messageInput = '[data-testid="message-input"], input[placeholder*="message"], textbox';
    await page.fill(messageInput, 'Hey! Pretty good day, just had some stressful work meetings about presenting');
    await page.press(messageInput, 'Enter');
    console.log('✅ Sent casual response with work stress mention');

    // Wait for AI to continue casual conversation and ask to start session
    await page.waitForFunction(() => {
      const messages = Array.from(document.querySelectorAll('[data-testid="coach-message"], .coach-message'));
      const lastMessage = messages[messages.length - 1] as HTMLElement;
      return lastMessage && lastMessage.textContent &&
             (lastMessage.textContent.toLowerCase().includes('start') ||
              lastMessage.textContent.toLowerCase().includes('session') ||
              lastMessage.textContent.toLowerCase().includes('explore'));
    }, { timeout: 15000 });
    console.log('✅ AI asked to start brainspotting session');

    // CRITICAL TEST: User agrees to start session
    await page.fill(messageInput, 'Yes, I would love to try that');
    await page.press(messageInput, 'Enter');
    console.log('✅ User agreed to start session');

    // CRITICAL TEST 1: Wait for MCP tool call UI element
    try {
      await page.waitForSelector('text*="therapy_session_transition"', { timeout: 10000 });
      console.log('✅ PASS: MCP tool call UI element appeared!');
    } catch (error) {
      console.log('❌ FAIL: MCP tool call UI element missing');
    }

    // CRITICAL TEST 2: Wait for phase transition in UI
    try {
      await page.waitForSelector('text="Issue Decision"', { timeout: 5000 });
      console.log('✅ PASS: UI updated to Issue Decision phase!');
    } catch (error) {
      console.log('❌ FAIL: UI still shows Pre-Session, phase did not update');
    }

    // CRITICAL TEST 3: Verify session timer is running
    try {
      const timer = await page.textContent('text*="/10:00"');
      console.log('✅ PASS: Session timer running:', timer);
    } catch (error) {
      console.log('❌ FAIL: Session timer not visible');
    }

    // CRITICAL TEST 4: AI should continue conversation therapeutically (not just "Okay.")
    await page.waitForFunction(() => {
      const messages = Array.from(document.querySelectorAll('[data-testid="coach-message"], .coach-message'));
      const lastMessage = messages[messages.length - 1] as HTMLElement;
      return lastMessage && lastMessage.textContent && lastMessage.textContent.length > 20;
    }, { timeout: 10000 });

    const finalResponse = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('[data-testid="coach-message"], .coach-message'));
      const lastMessage = messages[messages.length - 1] as HTMLElement;
      return lastMessage?.textContent || '';
    });

    if (finalResponse.length > 20) {
      console.log('✅ PASS: AI continued conversation therapeutically:', finalResponse);
    } else {
      console.log('❌ FAIL: AI gave brief response:', finalResponse);
    }

    console.log('\n🎯 STAGE 1 COMPLETE: Issue Decision transition tested');
    console.log('📋 SUMMARY: Pre-session ✅ | Issue Decision transition ❓');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

testSessionStart().catch(console.error);