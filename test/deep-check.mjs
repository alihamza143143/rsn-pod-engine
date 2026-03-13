import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:5173';
const API  = 'http://localhost:3001/api';
const SHOTS_DIR = './test/screenshots';
mkdirSync(SHOTS_DIR, { recursive: true });

function log(msg) { console.log(msg); }

async function shot(page, name) {
  const p = `${SHOTS_DIR}/${name}.png`;
  await page.screenshot({ path: p, fullPage: true });
  log(`  📸 screenshot → ${p}`);
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 600 });
  const ctx     = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page    = await ctx.newPage();

  // Collect console errors
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  // ── 1. Landing page ────────────────────────────────────────────────────────
  log('\n[1] Landing page');
  await page.goto(`${BASE}/welcome`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  log('  Title: ' + await page.title());
  const h1 = await page.$eval('h1', el => el.textContent.trim()).catch(() => '(no h1)');
  log('  H1: ' + h1);
  await shot(page, '01-landing');

  // ── 2. How it works ────────────────────────────────────────────────────────
  log('\n[2] How it works');
  await page.goto(`${BASE}/how-it-works`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '02-how-it-works');

  // ── 3. About ────────────────────────────────────────────────────────────────
  log('\n[3] About');
  await page.goto(`${BASE}/about`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '03-about');

  // ── 4. Reasons ───────────────────────────────────────────────────────────────
  log('\n[4] Reasons');
  await page.goto(`${BASE}/reasons`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '04-reasons');

  // ── 5. Login page ───────────────────────────────────────────────────────────
  log('\n[5] Login page');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '05-login');

  // ── 6. Request to join ──────────────────────────────────────────────────────
  log('\n[6] Request to join');
  await page.goto(`${BASE}/request-to-join`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '06-request-to-join');

  // ── 7. Auth redirect (protected routes) ─────────────────────────────────────
  log('\n[7] Protected route redirect check');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const redirectedTo = page.url();
  log('  / redirected to: ' + redirectedTo);
  await page.goto(`${BASE}/pods`, { waitUntil: 'networkidle' });
  const podsRedirect = page.url();
  log('  /pods redirected to: ' + podsRedirect);
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  const adminRedirect = page.url();
  log('  /admin redirected to: ' + adminRedirect);

  // ── 8. Magic link login flow ─────────────────────────────────────────────────
  log('\n[8] Testing magic link login flow');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Fill email
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await emailInput.fill('ali@rsn.network');
    await page.waitForTimeout(400);
    await shot(page, '08-login-filled');

    // Submit
    const submitBtn = await page.$('button[type="submit"], form button');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
      await shot(page, '09-login-submitted');
      log('  Login form submitted — waiting for response...');

      // Check if dev link appeared
      const devLink = await page.$('a[href*="/auth/verify"]');
      if (devLink) {
        const href = await devLink.getAttribute('href');
        log('  ✅ Dev magic link appeared: ' + href);
        await devLink.click();
        await page.waitForTimeout(3000);
        log('  After verify redirect: ' + page.url());
        await shot(page, '10-after-verify');
      } else {
        log('  ℹ️  No dev link (production mode or email sent)');
        // Check for success message
        const bodyText = await page.textContent('body');
        if (bodyText.includes('check your email') || bodyText.includes('sent') || bodyText.includes('link')) {
          log('  ✅ "Check email" message shown');
        }
      }
    }
  }

  // ── 9. API health checks ────────────────────────────────────────────────────
  log('\n[9] API endpoint checks (via fetch in browser context)');
  const apiChecks = await page.evaluate(async (api) => {
    const endpoints = [
      { path: '/auth/session',  method: 'GET', expectStatus: 401 },
      { path: '/pods',          method: 'GET', expectStatus: 401 },
      { path: '/auth/magic-link', method: 'POST', body: { email: 'test@test.com' }, expectStatus: [200, 429, 400] },
    ];
    const results = [];
    for (const ep of endpoints) {
      try {
        const opts = { method: ep.method, headers: { 'Content-Type': 'application/json' } };
        if (ep.body) opts.body = JSON.stringify(ep.body);
        const r = await fetch(`${api}${ep.path}`, opts);
        const json = await r.json().catch(() => null);
        const expected = Array.isArray(ep.expectStatus) ? ep.expectStatus : [ep.expectStatus];
        results.push({
          endpoint: ep.path,
          status: r.status,
          ok: expected.includes(r.status),
          response: json,
        });
      } catch(e) {
        results.push({ endpoint: ep.path, error: e.message });
      }
    }
    return results;
  }, API);

  for (const r of apiChecks) {
    if (r.error) {
      log(`  ❌ ${r.endpoint}: ${r.error}`);
    } else {
      log(`  ${r.ok ? '✅' : '⚠️ '} ${r.endpoint} → HTTP ${r.status}`);
    }
  }

  // ── Final summary ──────────────────────────────────────────────────────────
  log('\n======= FINAL SUMMARY =======');
  log(`Protected route redirects: ${redirectedTo.includes('welcome') || redirectedTo.includes('login') ? '✅' : '❌'}`);
  log(`Console errors caught: ${errors.length}`);
  if (errors.length) errors.slice(0, 10).forEach(e => log('  ⚠️  ' + e));
  log('Screenshots saved to: test/screenshots/');
  log('\nBrowser staying open for 15 seconds so you can inspect...');
  await page.waitForTimeout(15000);

  await browser.close();
  log('Done.');
})();
