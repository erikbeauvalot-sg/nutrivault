/**
 * Patient Management E2E Tests
 * Tests patient CRUD operations
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { PatientsPage } from '../pages/PatientsPage.js';
import { generateUniqueEmail } from '../fixtures/testData.js';

test.describe('Patient Management', () => {
  let patientsPage;
  let testPatientEmail;

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await login(page, 'admin');
    
    patientsPage = new PatientsPage(page);
    await patientsPage.goto();
    
    // Generate unique email for this test run
    testPatientEmail = generateUniqueEmail('patient');
  });

  test('should display patients list page', async ({ page }) => {
    await expect(patientsPage.heading).toBeVisible();
    await expect(patientsPage.createButton).toBeVisible();
    await expect(patientsPage.patientsTable).toBeVisible();
  });

  test('should create a new patient successfully', async ({ page }) => {
    await patientsPage.goToCreate();
    
    // Wait for form to load
    await expect(patientsPage.firstNameInput).toBeVisible();
    
    // Fill patient form
    const patientData = {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1985-05-15',
      gender: 'male',
      email: testPatientEmail,
      phone: '5551234567',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip_code: '62701',
      emergency_contact_name: 'Jane Doe',
      emergency_contact_phone: '5559876543'
    };
    
    await patientsPage.createPatient(patientData);
    
    // Should show success message or redirect
    await page.waitForURL(/.*patients/, { timeout: 5000 });
    
    // Verify patient appears in list
    await patientsPage.searchPatient(testPatientEmail);
    const exists = await patientsPage.patientExists(testPatientEmail);
    expect(exists).toBeTruthy();
  });

  test('should validate required fields when creating patient', async ({ page }) => {
    await patientsPage.goToCreate();
    
    // Submit empty form
    await patientsPage.submitButton.click();
    
    // Should show validation errors
    const firstNameError = page.locator('text=/first.*name.*required/i');
    const lastNameError = page.locator('text=/last.*name.*required/i');
    
    await expect(firstNameError.or(lastNameError)).toBeVisible({ timeout: 3000 });
  });

  test('should search for patients', async ({ page }) => {
    // Create a patient first
    await patientsPage.goToCreate();
    await patientsPage.createPatient({
      first_name: 'Search',
      last_name: 'Test',
      date_of_birth: '1990-01-01',
      gender: 'female',
      email: testPatientEmail,
      phone: '5551111111'
    });
    
    await page.waitForURL(/.*patients/);
    
    // Search for the patient
    await patientsPage.searchPatient(testPatientEmail);
    
    // Should find the patient
    const exists = await patientsPage.patientExists(testPatientEmail);
    expect(exists).toBeTruthy();
  });

  test('should view patient details', async ({ page }) => {
    // Create a patient first
    await patientsPage.goToCreate();
    await patientsPage.createPatient({
      first_name: 'View',
      last_name: 'Details',
      date_of_birth: '1988-03-20',
      gender: 'male',
      email: testPatientEmail,
      phone: '5552222222'
    });
    
    await page.waitForURL(/.*patients/);
    
    // Click on patient row
    await patientsPage.searchPatient(testPatientEmail);
    await patientsPage.clickPatientRow(testPatientEmail);
    
    // Should navigate to patient details page
    await expect(page).toHaveURL(/.*patients\/\d+/);
  });

  test('should update patient information', async ({ page }) => {
    // Create a patient first
    await patientsPage.goToCreate();
    await patientsPage.createPatient({
      first_name: 'Update',
      last_name: 'Test',
      date_of_birth: '1987-07-07',
      gender: 'female',
      email: testPatientEmail,
      phone: '5553333333'
    });
    
    await page.waitForURL(/.*patients/);
    
    // Go to edit page
    await patientsPage.searchPatient(testPatientEmail);
    const row = page.locator(`tr:has-text("${testPatientEmail}")`);
    await row.locator('button:has-text("Edit"), a:has-text("Edit")').click();
    
    // Update phone number
    await patientsPage.phoneInput.clear();
    await patientsPage.phoneInput.fill('5559999999');
    await patientsPage.submitButton.click();
    
    // Verify update
    await page.waitForURL(/.*patients/);
    await patientsPage.searchPatient(testPatientEmail);
    await expect(page.locator('text="5559999999"')).toBeVisible({ timeout: 3000 });
  });

  test('should delete patient', async ({ page }) => {
    // Create a patient first
    await patientsPage.goToCreate();
    await patientsPage.createPatient({
      first_name: 'Delete',
      last_name: 'Test',
      date_of_birth: '1992-12-12',
      gender: 'male',
      email: testPatientEmail,
      phone: '5554444444'
    });
    
    await page.waitForURL(/.*patients/);
    
    // Delete the patient
    await patientsPage.searchPatient(testPatientEmail);
    await patientsPage.deletePatient(testPatientEmail);
    
    // Verify patient no longer exists
    await patientsPage.searchPatient(testPatientEmail);
    const exists = await patientsPage.patientExists(testPatientEmail);
    expect(exists).toBeFalsy();
  });

  test('should prevent duplicate email', async ({ page }) => {
    // Create first patient
    await patientsPage.goToCreate();
    await patientsPage.createPatient({
      first_name: 'First',
      last_name: 'Patient',
      date_of_birth: '1980-01-01',
      gender: 'male',
      email: testPatientEmail,
      phone: '5555555555'
    });
    
    await page.waitForURL(/.*patients/);
    
    // Try to create another patient with same email
    await patientsPage.goToCreate();
    await patientsPage.createPatient({
      first_name: 'Second',
      last_name: 'Patient',
      date_of_birth: '1981-02-02',
      gender: 'female',
      email: testPatientEmail, // Same email
      phone: '5556666666'
    });
    
    // Should show error
    await expect(patientsPage.errorMessage).toBeVisible({ timeout: 3000 });
  });
});
