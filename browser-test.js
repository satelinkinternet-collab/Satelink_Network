import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:8080/health');
  console.log("Health page status:", await page.textContent('body'));

  await page.goto('http://localhost:8080/dashboard/revenue-live');
  console.log("Dashboard loaded");

  await page.screenshot({ path: 'dashboard.png' });

  await browser.close();
})();
