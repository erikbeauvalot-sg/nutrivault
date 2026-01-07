// Mock uuid module for Jest
// uuid v13 is pure ESM which Jest doesn't handle well with CommonJS

const { randomUUID } = require('crypto');

module.exports = {
  v4: () => randomUUID(),
  v1: () => randomUUID(),
  v3: () => randomUUID(),
  v5: () => randomUUID(),
  validate: (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
};
