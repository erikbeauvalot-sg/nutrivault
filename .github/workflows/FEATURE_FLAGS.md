# CI/CD Workflow Feature Flags

This document explains how to control the CI/CD workflow execution using feature flags.

## Overview

The CI/CD pipeline includes granular feature flags that allow you to enable/disable different parts of the workflow without modifying the workflow file itself. These flags are configured as GitHub repository variables.

## Feature Flags

### 1. Global Workflow Control

#### `WORKFLOW_ENABLED`
- **Type**: Environment variable
- **Default**: `true`
- **Location**: Workflow file (`env` section)
- **Purpose**: Master switch for the entire workflow
- **Values**:
  - `true`: Workflow executes normally
  - `false` or not set: Workflow is skipped entirely

**To disable the entire workflow**, edit `.github/workflows/ci-cd.yml` and set:
```yaml
env:
  WORKFLOW_ENABLED: 'false'
```

### 2. Security Scan Flags

#### `SECURITY_SCAN_ENABLED`
- **Type**: GitHub Repository Variable
- **Default**: `true`
- **Purpose**: Controls whether security scanning job runs
- **Values**:
  - `true`: Security scans execute
  - `false` or not set: Security scans are skipped

#### `SNYK_SCAN_ENABLED`
- **Type**: GitHub Repository Variable  
- **Default**: `true`
- **Purpose**: Controls Snyk dependency vulnerability scanning
- **Dependencies**: Requires `SECURITY_SCAN_ENABLED = true` and `SNYK_TOKEN` secret
- **Values**:
  - `true`: Snyk scans execute
  - `false` or not set: Snyk scans are skipped

#### `TRIVY_SCAN_ENABLED`
- **Type**: GitHub Repository Variable
- **Default**: `true`
- **Purpose**: Controls Trivy filesystem vulnerability scanning
- **Dependencies**: Requires `SECURITY_SCAN_ENABLED = true`
- **Values**:
  - `true`: Trivy scans execute
  - `false` or not set: Trivy scans are skipped

### 3. Deployment Flags

#### `DEPLOYMENT_ENABLED`
- **Type**: GitHub Repository Variable
- **Default**: `true`
- **Purpose**: Master switch for all deployments
- **Values**:
  - `true`: Deployments can proceed (if other conditions met)
  - `false` or not set: All deployments are disabled

#### `STAGING_DEPLOYMENT_ENABLED`
- **Type**: GitHub Repository Variable
- **Default**: `true`
- **Purpose**: Controls staging environment deployments
- **Dependencies**: Requires `DEPLOYMENT_ENABLED = true`
- **Values**:
  - `true`: Staging deployments execute (on `develop` branch)
  - `false` or not set: Staging deployments are skipped

#### `PRODUCTION_DEPLOYMENT_ENABLED`
- **Type**: GitHub Repository Variable
- **Default**: `true`
- **Purpose**: Controls production environment deployments
- **Dependencies**: Requires `DEPLOYMENT_ENABLED = true`
- **Values**:
  - `true`: Production deployments execute (on `main` branch)
  - `false` or not set: Production deployments are skipped

## Configuration

### Setting Repository Variables

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
3. Click **New repository variable**
4. Add the following variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `SECURITY_SCAN_ENABLED` | `true` or `false` | Enable/disable all security scans |
| `SNYK_SCAN_ENABLED` | `true` or `false` | Enable/disable Snyk scans |
| `TRIVY_SCAN_ENABLED` | `true` or `false` | Enable/disable Trivy scans |
| `DEPLOYMENT_ENABLED` | `true` or `false` | Enable/disable all deployments |
| `STAGING_DEPLOYMENT_ENABLED` | `true` or `false` | Enable/disable staging deployments |
| `PRODUCTION_DEPLOYMENT_ENABLED` | `true` or `false` | Enable/disable production deployments |

### Modifying Workflow File Variables

To change the global `WORKFLOW_ENABLED` flag, edit `.github/workflows/ci-cd.yml`:

```yaml
env:
  WORKFLOW_ENABLED: 'false'  # Change to 'false' to disable entire workflow
```

## Use Cases

### 1. Disable Entire Workflow Temporarily
**Scenario**: Maintenance window, pausing all CI/CD operations

**Action**:
```yaml
# Edit .github/workflows/ci-cd.yml
env:
  WORKFLOW_ENABLED: 'false'
```

**Result**: All workflow jobs are skipped

### 2. Disable Security Scans (Cost Savings)
**Scenario**: Reduce CI costs during development phase

**Action**: Set repository variable
- `SECURITY_SCAN_ENABLED` = `false`

**Result**: Security scan job is skipped, but tests and builds continue

### 3. Disable Specific Security Tools
**Scenario**: Snyk subscription expired, but Trivy still available

**Action**: Set repository variable
- `SNYK_SCAN_ENABLED` = `false`
- `TRIVY_SCAN_ENABLED` = `true`

**Result**: Only Trivy scans run

### 4. Disable All Deployments (Emergency)
**Scenario**: Critical bug discovered, prevent any deployments

**Action**: Set repository variable
- `DEPLOYMENT_ENABLED` = `false`

**Result**: No staging or production deployments occur

### 5. Production Freeze (Staging Only)
**Scenario**: Production freeze period, but staging deployments continue

**Action**: Set repository variables
- `DEPLOYMENT_ENABLED` = `true`
- `STAGING_DEPLOYMENT_ENABLED` = `true`
- `PRODUCTION_DEPLOYMENT_ENABLED` = `false`

**Result**: Staging deployments proceed, production deployments are blocked

### 6. Development Mode (Tests Only)
**Scenario**: Focus on testing, disable scans and deployments

**Action**: Set repository variables
- `SECURITY_SCAN_ENABLED` = `false`
- `DEPLOYMENT_ENABLED` = `false`

**Result**: Only backend tests, frontend tests, and code quality checks run

## Best Practices

1. **Default to Enabled**: Keep all flags `true` by default in production
2. **Document Changes**: Add comments when disabling flags explaining why
3. **Temporary Disabling**: Use repository variables (not workflow file) for temporary changes
4. **Monitoring**: Review disabled flags regularly to re-enable when conditions met
5. **Security**: Never disable security scans in production without approval
6. **Communication**: Notify team when disabling deployment flags

## Flag Dependencies

```
WORKFLOW_ENABLED (env)
  ├── SECURITY_SCAN_ENABLED (var)
  │   ├── SNYK_SCAN_ENABLED (var)
  │   └── TRIVY_SCAN_ENABLED (var)
  └── DEPLOYMENT_ENABLED (var)
      ├── STAGING_DEPLOYMENT_ENABLED (var)
      └── PRODUCTION_DEPLOYMENT_ENABLED (var)
```

**Legend**:
- `(env)`: Defined in workflow file `env` section
- `(var)`: GitHub repository variable

## Verification

### Check Current Flag Values

```bash
# View workflow file flags
cat .github/workflows/ci-cd.yml | grep -A 10 "Feature Flags"

# View repository variables (requires GitHub CLI)
gh variable list
```

### Test Flag Behavior

1. **Disable security scans**:
   ```bash
   gh variable set SECURITY_SCAN_ENABLED --body "false"
   ```

2. **Trigger workflow**:
   ```bash
   git commit --allow-empty -m "test: Verify security scan disabled"
   git push
   ```

3. **Verify in Actions tab**: Security scan job should show as skipped

4. **Re-enable**:
   ```bash
   gh variable set SECURITY_SCAN_ENABLED --body "true"
   ```

## Troubleshooting

### Flag Not Working

**Problem**: Changed flag but behavior didn't change

**Solution**:
1. Verify flag name matches exactly (case-sensitive)
2. Check if using `vars.FLAG_NAME` (repository variable) vs `env.FLAG_NAME` (workflow env)
3. Ensure workflow has been re-run after flag change
4. Check workflow logs for flag evaluation

### Jobs Still Running When Disabled

**Problem**: Job runs even with flag set to `false`

**Solution**:
1. Check parent flag dependencies (e.g., `SECURITY_SCAN_ENABLED` for security tools)
2. Verify flag value is exactly `'true'` or `'false'` (quoted string)
3. Check `if` condition in workflow job definition

### Can't Set Repository Variable

**Problem**: Don't have permissions to set variables

**Solution**:
1. Ensure you have admin access to repository
2. Contact repository owner to grant permissions
3. Alternative: Ask admin to set variables on your behalf

## Migration from Old Workflow

If upgrading from a workflow without feature flags:

1. **No action required**: All flags default to `true`
2. **Optional**: Set repository variables to match your needs
3. **Recommended**: Review and configure flags for your environment

## Support

For issues with feature flags:
1. Check this documentation
2. Review workflow logs in Actions tab
3. Contact DevOps team
4. Open GitHub issue with workflow run URL

---

**Last Updated**: 2026-01-08
**Workflow Version**: 2.0 (with feature flags)
