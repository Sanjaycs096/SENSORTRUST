/**
 * SensorTrust — Playwright End-to-End Test Suite
 * Covers all 5 operational screens and 12 Phase 2 acceptance criteria.
 * Compatible with GitHub Actions and Playwright test runner.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe('SensorTrust Phase 2 Frontend Acceptance Tests', () => {
  test('1. Navigation across 4 primary operational routes, observation detail, and spec redirect', async ({ page }) => {
    // 1. Dashboard
    await page.goto(`${BASE_URL}/`);
    await expect(page.locator('h2')).toContainText('Monitoring Dashboard');
    await expect(page.locator('text=Total Ingested')).toBeVisible();

    // Verify Phase 1 Blueprint is NOT in navigation
    await expect(page.locator('button:has-text("Phase 1 Blueprint")')).toHaveCount(0);

    // 2. Submit Observation
    await page.click('button:has-text("Submit Observation")');
    await expect(page).toHaveURL(`${BASE_URL}/submit`);
    await expect(page.locator('h2')).toContainText('Submit PM2.5 Observation');

    // 3. Reviewer Queue
    await page.click('button:has-text("Reviewer Workspace")');
    await expect(page).toHaveURL(`${BASE_URL}/reviewer/queue`);
    await expect(page.locator('h2')).toContainText('Reviewer Workspace');

    // 4. Provenance Explorer
    await page.click('button:has-text("Provenance Explorer")');
    await expect(page).toHaveURL(`${BASE_URL}/provenance`);
    await expect(page.locator('h2')).toContainText('Public Provenance Explorer');

    // 5. Direct navigation to /spec redirects cleanly to Dashboard
    await page.goto(`${BASE_URL}/spec`);
    await expect(page.locator('h2')).toContainText('Monitoring Dashboard');
  });

  test('2. Observation form physical range validation rejects negative PM2.5', async ({ page }) => {
    await page.goto(`${BASE_URL}/submit`);

    // Click "Load Invalid" to test negative PM2.5
    await page.click('button:has-text("Load Invalid")');
    await page.click('button:has-text("Validate & Ingest Observation")');

    // Expect physical validation error
    await expect(page.locator('text=Physical Validation Rejection')).toBeVisible();
    await expect(page.locator('text=ERR_RANGE_NEGATIVE')).toBeVisible();
  });

  test('3. Loading spike sample preset populates valid scenario fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/submit`);
    await page.click('button:has-text("Load Spike Sample")');

    const valueInput = page.locator('input[type="number"][step="0.1"]');
    await expect(valueInput).toHaveValue('284.6');
  });

  test('4. Successful submission flags high spike and redirects to details view', async ({ page }) => {
    await page.goto(`${BASE_URL}/submit`);
    await page.click('button:has-text("Load Spike Sample")');
    await page.click('button:has-text("Validate & Ingest Observation")');

    // Redirects to details page
    await expect(page).toHaveURL(/\/observations\//);
    await expect(page.locator('text=284.6')).toBeVisible();
    await expect(page.locator('text=Deterministic Validation Gates')).toBeVisible();
    await expect(page.locator('text=Anomaly Screening & Evidence')).toBeVisible();
  });

  test('5. Duplicate ID submission returns conflict error', async ({ page }) => {
    await page.goto(`${BASE_URL}/submit`);
    // Seed already contains this UUID
    const duplicateIdInput = page.locator('input[value*="urn:uuid:"]');
    await duplicateIdInput.fill('urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7');
    await page.click('button:has-text("Validate & Ingest Observation")');

    await expect(page.locator('text=Duplicate Observation ID Detected')).toBeVisible();
  });

  test('6. Reviewer workspace requires minimum 10 characters for decision', async ({ page }) => {
    await page.goto(`${BASE_URL}/reviewer/queue`);

    // Select first observation in queue
    const firstQueueItem = page.locator('button:has-text("µg/m³")').first();
    await firstQueueItem.click();

    // Type short 5-char reason
    const textarea = page.locator('textarea');
    await textarea.fill('Short');

    // Button should be disabled
    const submitBtn = page.locator('button:has-text("Record & Anchor Decision")');
    await expect(submitBtn).toBeDisabled();

    // Type valid >=10 char justification
    await textarea.fill('Physical inspection confirms faulty optical chamber.');
    await expect(submitBtn).toBeEnabled();

    // Submit decision
    await submitBtn.click();
    await expect(page.locator('text=Decision successfully recorded and anchored')).toBeVisible();
  });

  test('7. Provenance explorer verifies untampered record and flags tampered data', async ({ page }) => {
    await page.goto(`${BASE_URL}/provenance`);

    // Click "Verify Digest" on authentic seed
    await page.click('button:has-text("Verify Digest")');
    await expect(page.locator('text=Verification Succeeded: Data Untampered')).toBeVisible();

    // Tamper value by +0.1
    await page.click('button:has-text("Tamper Value (+0.1)")');
    await page.click('button:has-text("Verify Digest")');
    await expect(page.locator('text=Verification Failed: Data Mismatch Detected')).toBeVisible();
  });

  test('8. Unknown routes render clean 404 page', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-route-path`);
    await expect(page.locator('text=404 — Page Not Found')).toBeVisible();
    await page.click('button:has-text("Return to Dashboard")');
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });
});
