---
description: 'Workspace memory for testing practices and minimal test setup for Node projects in this repo.'
applyTo: 'package.json'
---

# Testing Memory

Concise guidance for ensuring a repository has a runnable test setup and a sensible default `test` script.

## Tag Line

Keep `npm test` useful: provide a real test runner and a sample test so CI and contributors have a working entry point.

## Learning: Provide a default test script and minimal Jest setup

- Problem: Running `npm test` in this repository shows `Error: no test specified` because `package.json` lacks a test runner.
- Pattern: For Node projects, add `jest` (or another runner) and a `tests/` directory with a simple smoke test.
- Steps:
  1. Install dev dependencies: `npm install --save-dev jest @types/jest` (or `pnpm`/`yarn` equivalents).
  2. Add a `test` script to `package.json`: `"test": "jest --coverage"`.
  3. Create a minimal test file: `tests/sample.test.js` that imports a tiny function or asserts true to verify the runner.
  4. Run `npm test` locally and ensure it exits with code 0 before pushing or configuring CI.

## Rationale

- A runnable `npm test` prevents confusion for contributors and provides a reliable CI entrypoint.
- Prefer lightweight, fast tests for repository bootstrapping; expand coverage progressively.

## Quick Example

Create `tests/sample.test.js` with:

```
test('sanity', () => {
  expect(true).toBe(true);
});
```

## When to add global guidance

- If this pattern repeats across multiple repos, move an adapted version of this file to global prompts (`vscode-userdata:/User/prompts/testing-memory.instructions.md`).