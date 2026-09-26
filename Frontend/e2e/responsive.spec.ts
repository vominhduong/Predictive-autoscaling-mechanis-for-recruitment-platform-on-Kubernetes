import { expect, test } from '@playwright/test';

const sizes = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const size of sizes) {
  test(`public experience fits ${size.width}px (${size.name}) without serious console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/api/v1/jobs**', route => route.fulfill({ json: { success: true, message: 'ok', timestamp: new Date().toISOString(), data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true } } }));
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const path of ['/', '/jobs', '/login', '/register']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow, `${path} overflows at ${size.width}px`).toBe(false);
    }
    expect(errors).toEqual([]);
  });
}
