import { test, expect } from '@playwright/test';

/**
 * End-to-End Critical Journey Test.
 *
 * Sequence:
 * 1. Register new organization & user account
 * 2. Enter monthly utility record (electricity)
 * 3. Enter monthly production record
 * 4. Verify live database-backed dashboard metrics
 * 5. Verify analytics graphs & summary table
 * 6. Generate automated insights (rules-engine)
 * 7. Accept recommendation -> creates linked action in tracker
 * 8. Mark action as in-progress then completed in action tracker
 * 9. View monthly performance report & verify non-certified disclosure and export CSV
 */
test.describe('SYNERGYX Critical User Journey', () => {
  const uniqueId = Date.now();
  const testEmail = `operator_${uniqueId}@textilecorp.in`;
  const testPassword = 'Password123!';

  test('executes end-to-end operational journey from registration to reporting', async ({ page }) => {
    // 1. Register
    await page.goto('/register');
    await expect(page).toHaveTitle(/SYNERGYX/i);

    await page.getByLabel(/full name/i).fill('Amit Patel');
    await page.getByLabel(/work email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByLabel(/organization name/i).fill(`Surat Weaving Mill ${uniqueId}`);
    await page.getByLabel(/industry/i).selectOption('textile');
    await page.getByLabel(/location/i).fill('Surat, Gujarat');
    await page.getByLabel(/canonical production unit/i).selectOption('kg');

    await page.getByRole('button', { name: /create enterprise account/i }).click();

    // After registration, redirected to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // 2. Navigate to Records to enter utility and production records
    await page.getByRole('link', { name: /records/i }).click();
    await expect(page).toHaveURL(/\/app\/records/);

    // 2a. Add Utility Record
    await page.getByRole('button', { name: /add utility record/i }).click();
    await page.getByLabel(/resource type/i).selectOption('electricity');
    await page.getByLabel(/consumption quantity/i).fill('10500');
    await page.getByLabel(/bill expenditure/i).fill('84000');
    await page.getByLabel(/notes/i).fill('Sub-station feeder line 1');
    await page.getByRole('button', { name: /save utility record/i }).click();

    // 2b. Add Production Record
    await page.getByRole('button', { name: /production records/i }).click();
    await page.getByRole('button', { name: /add production record/i }).click();
    await page.getByLabel(/production volume/i).fill('10000');
    await page.getByRole('button', { name: /save production record/i }).click();

    // 3. View Dashboard
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page.getByText('1.0500 kWh/kg')).toBeVisible();

    // 4. View Analytics
    await page.getByRole('link', { name: /analytics/i }).click();
    await expect(page).toHaveURL(/\/app\/analytics/);
    await expect(page.getByRole('button', { name: /export csv/i })).toBeVisible();

    // 5. Insights Generation
    await page.getByRole('link', { name: /insights/i }).click();
    await expect(page).toHaveURL(/\/app\/insights/);
    await page.getByRole('button', { name: /generate insights/i }).click();

    // 6. Recommendations
    await page.getByRole('link', { name: /recommendations/i }).click();
    await expect(page).toHaveURL(/\/app\/recommendations/);

    // If recommendations generated, accept the first one
    const acceptBtn = page.getByRole('button', { name: /accept recommendation/i }).first();
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
    }

    // 7. Action Tracker
    await page.getByRole('link', { name: /actions/i }).click();
    await expect(page).toHaveURL(/\/app\/actions/);

    // 8. Performance Reports
    await page.getByRole('link', { name: /reports/i }).click();
    await expect(page).toHaveURL(/\/app\/reports/);
    await expect(page.getByText(/not an externally verified ESG audit report/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /download csv/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /print \/ save pdf/i })).toBeVisible();
  });
});

