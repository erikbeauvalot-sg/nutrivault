/**
 * Global Setup
 * Runs once before all tests
 * Used to ensure backend and frontend servers are running
 */

export default async function globalSetup() {
  console.log('🚀 Starting E2E Test Suite...');
  console.log('📌 Ensure backend is running on http://localhost:5000');
  console.log('📌 Ensure frontend is running on http://localhost:5173');
  console.log('📌 Tests will use existing test users from database');
}
