/**
 * MSW Server Setup for Tests
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup server with default handlers
export const server = setupServer(...handlers);

// Start server before all tests
export const startServer = () => {
  server.listen({ onUnhandledRequest: 'warn' });
};

// Reset handlers after each test
export const resetHandlers = () => {
  server.resetHandlers();
};

// Close server after all tests
export const closeServer = () => {
  server.close();
};

export default server;
