import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:5173';
const SHOTS_DIR = './test/screenshots';
mkdirSync(SHOTS_DIR, { recursive: true });

const results = [];

async function check(browser, name, url, checks = []) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    const title = await page.title();
    const bodyText = await page.textContent('body');
    const finalUrl = page.url();
    const shot = `${SHOTS_DIR}/${name}.png`;
    await page.screenshot({ path: shot, fullPage: true });

    const result = {
      name,
      url,
      finalUrl,
      status: res?.status(),
      title,
      consoleErrors: errors.slice(0, 5),
      checks: [],
    };

    for (const { selector, label } of checks) {
      const el = await page.$(selector);
      result.checks.push({ label, found: !!el });
    }

    // Check for obvious errors
    result.hasErrorPage = bodyText.includes('Cannot GET') || bodyText.includes('404') && bodyText.length < 200;
    result.screenshotPath = shot;
    results.push(result);
    console.log(`✅ ${name}: ${finalUrl} (${res?.status()})`);
  } catch (e) {
    results.push({ name, url, error: e.message });
    console.log(`❌ ${name}: ${e.message}`);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false });

  await check(browser, '01-landing', `${BASE}/welcome`, [
    { selector: 'h1', label: 'Headline h1' },
    { selector: 'nav', label: 'Navigation' },
    { selector: 'a[href*="login"], button', label: 'CTA button' },
  ]);

  await check(browser, '02-login', `${BASE}/login`, [
    { selector: 'input[type="email"]', label: 'Email input' },
    { selector: 'button[type="submit"], button', label: 'Submit button' },
  ]);

  await check(browser, '03-how-it-works', `${BASE}/how-it-works`, [
    { selector: 'h1,h2', label: 'Heading' },
  ]);

  await check(browser, '04-about', `${BASE}/about`, [
    { selector: 'h1,h2', label: 'Heading' },
  ]);

  await check(browser, '05-request-to-join', `${BASE}/request-to-join`, [
    { selector: 'input[type="email"]', label: 'Email input' },
    { selector: 'form', label: 'Form' },
  ]);

  await check(browser, '06-home-redirect', `${BASE}/`, []);
  await check(browser, '07-pods-redirect', `${BASE}/pods`, []);

  await browser.close();

  console.log('\n======= REPORT =======');
  for (const r of results) {
    if (r.error) {
      console.log(`\n❌ ${r.name}: ERROR — ${r.error}`);
      continue;
    }
    console.log(`\n📄 ${r.name}`);
    console.log(`   URL: ${r.url} → ${r.finalUrl}`);
    console.log(`   HTTP: ${r.status} | Title: ${r.title}`);
    if (r.checks.length) console.log(`   Checks: ${r.checks.map(c => `${c.found ? '✅' : '❌'} ${c.label}`).join(', ')}`);
    if (r.consoleErrors.length) console.log(`   Console errors: ${r.consoleErrors.join('; ')}`);
    if (r.hasErrorPage) console.log(`   ⚠️  Looks like error page`);
    console.log(`   Screenshot: ${r.screenshotPath}`);
  }
})();
