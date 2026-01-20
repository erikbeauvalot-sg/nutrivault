# Git Hooks for NutriVault

This directory contains Git hooks that help maintain code quality and ensure proper internationalization.

## Available Hooks

### pre-commit
- **Purpose**: Runs translation checks on staged frontend files before commits
- **Triggers**: Automatically runs when committing files with extensions `.jsx`, `.tsx`, `.js`, `.ts` in `frontend/src/`
- **Actions**:
  - Checks for user-facing strings that may need translation
  - Validates translation file syntax
  - Prevents commits if translation issues are detected

## Setup Instructions

To enable these hooks in your local repository:

### Option 1: Copy to .git/hooks (Recommended)
```bash
# Copy the hook to your local .git/hooks directory
cp hooks/pre-commit .git/hooks/

# Make sure it's executable
chmod +x .git/hooks/pre-commit
```

### Option 2: Use hooksPath (For shared hooks)
```bash
# Configure git to use this directory for hooks
git config core.hooksPath hooks/
```

## Hook Behavior

### Pre-commit Hook
- **When it runs**: Before each commit that includes frontend files
- **What it does**:
  1. Identifies staged frontend files
  2. Runs translation validation
  3. Reports any issues found
- **Failure behavior**: Prevents the commit if translation issues are detected
- **Override**: Use `git commit --no-verify` to bypass (not recommended)

## Troubleshooting

### Hook not running
- Ensure the hook file is executable: `chmod +x .git/hooks/pre-commit`
- Check that you're committing files that trigger the hook
- Verify the hook is in the correct location

### False positives
- The hook may flag files that already use translation keys properly
- Review the output and run `./run-translation-agent.sh` for detailed analysis

### Hook too restrictive
- For urgent commits, use `git commit --no-verify`
- Report issues to improve the hook's accuracy

## Related Files

- `run-translation-agent.sh` - Manual translation checking script
- `.github/prompts/frontend-translation-agent.prompt.md` - Full translation agent
- `frontend/src/locales/` - Translation files maintained by the agent

## Development Notes

- Hooks are automatically enabled for contributors who follow the setup instructions
- The pre-commit hook is designed to be fast and non-disruptive
- Translation issues are reported clearly with actionable next steps
- Hooks can be bypassed in emergency situations using `--no-verify`