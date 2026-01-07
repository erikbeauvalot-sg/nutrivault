/**
 * Cleanup Helper
 * Provides functions to clean up test data after tests
 */

/**
 * Wait for a short duration
 * @param {number} ms - Milliseconds to wait
 */
export async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function multiple times
 * @param {Function} fn - Function to retry
 * @param {number} retries - Number of retries
 * @param {number} delay - Delay between retries in ms
 */
export async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await wait(delay);
    }
  }
}

/**
 * Delete test patient by email
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} email - Patient email
 */
export async function deleteTestPatient(page, email) {
  try {
    await page.goto('/patients');
    await page.fill('[placeholder*="Search"]', email);
    await page.click('button:has-text("Search")');
    await wait(1000);
    
    // Check if patient exists
    const patientRow = page.locator(`tr:has-text("${email}")`);
    if (await patientRow.count() > 0) {
      await patientRow.locator('button:has-text("Delete")').click();
      await page.click('button:has-text("Confirm")');
      await wait(500);
    }
  } catch (error) {
    console.log(`Failed to delete test patient: ${error.message}`);
  }
}

/**
 * Delete test user by username
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} username - Username
 */
export async function deleteTestUser(page, username) {
  try {
    await page.goto('/users');
    await page.fill('[placeholder*="Search"]', username);
    await page.click('button:has-text("Search")');
    await wait(1000);
    
    // Check if user exists
    const userRow = page.locator(`tr:has-text("${username}")`);
    if (await userRow.count() > 0) {
      await userRow.locator('button:has-text("Delete")').click();
      await page.click('button:has-text("Confirm")');
      await wait(500);
    }
  } catch (error) {
    console.log(`Failed to delete test user: ${error.message}`);
  }
}

/**
 * Clear form inputs
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function clearForm(page) {
  const inputs = await page.locator('input[type="text"], input[type="email"], textarea').all();
  for (const input of inputs) {
    await input.clear();
  }
}

/**
 * Take screenshot with timestamp
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} name - Screenshot name
 */
export async function takeScreenshot(page, name) {
  const timestamp = Date.now();
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true 
  });
}
