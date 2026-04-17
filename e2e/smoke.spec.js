import { test, expect } from '@playwright/test';

test.describe('E2E smoke', () => {
  test('E2E-1: first paint shows shell or Auth0 setup message', async ({ page }) => {
    await page.goto('/');
    const authHeading = page.getByRole('heading', { name: /Auth0 not configured/i });
    const shell = page.locator('.app-shell');
    await expect(authHeading.or(shell).first()).toBeVisible({ timeout: 30000 });
  });

  test('E2E-2: backend health JSON', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:4000/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('mongodb');
    expect(body).toHaveProperty('status');
  });
});
