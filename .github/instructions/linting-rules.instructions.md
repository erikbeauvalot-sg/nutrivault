# Linting Rules Configuration

This document describes the recommended linting rules for various languages to maintain code quality.

## JavaScript/TypeScript (ESLint)

### .eslintrc.json
```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    // Possible Errors
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "no-duplicate-imports": "error",
    
    // Best Practices
    "eqeqeq": ["error", "always"],
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-var": "error",
    "prefer-const": "error",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    
    // Style
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "comma-dangle": ["error", "always-multiline"],
    "max-len": ["warn", { "code": 100 }],
    "max-lines-per-function": ["warn", { "max": 50 }],
    
    // ES6+
    "arrow-body-style": ["error", "as-needed"],
    "prefer-arrow-callback": "error",
    "prefer-template": "error",
    "no-useless-concat": "error",
    
    // TypeScript Specific
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-non-null-assertion": "warn"
  }
}
```

## Python (Pylint/Flake8)

### .pylintrc
```ini
[MASTER]
max-line-length=88
disable=
    C0111,  # missing-docstring (handled by pydocstyle)
    R0903,  # too-few-public-methods

[MESSAGES CONTROL]
enable=
    useless-suppression,
    deprecated-pragma,
    use-symbolic-message-instead

[DESIGN]
max-args=5
max-attributes=7
max-bool-expr=5
max-branches=12
max-locals=15
max-parents=7
max-public-methods=20
max-returns=6
max-statements=50
min-public-methods=1

[FORMAT]
indent-string='    '
max-line-length=88
```

### setup.cfg (Flake8)
```ini
[flake8]
max-line-length = 88
extend-ignore = E203, W503
exclude = 
    .git,
    __pycache__,
    build,
    dist,
    venv

per-file-ignores =
    __init__.py:F401

max-complexity = 10
```

## C# (EditorConfig)

### .editorconfig
```ini
root = true

[*.cs]
# Indentation
indent_style = space
indent_size = 4

# Line endings
end_of_line = crlf
insert_final_newline = true

# Code Style
csharp_prefer_braces = true:warning
csharp_prefer_simple_using_statement = true:suggestion

# Naming Conventions
dotnet_naming_rule.interfaces_should_be_prefixed_with_i.severity = warning
dotnet_naming_rule.interfaces_should_be_prefixed_with_i.symbols = interface
dotnet_naming_rule.interfaces_should_be_prefixed_with_i.style = begins_with_i

dotnet_naming_symbols.interface.applicable_kinds = interface

dotnet_naming_style.begins_with_i.required_prefix = I
dotnet_naming_style.begins_with_i.capitalization = pascal_case

# Code Quality
dotnet_diagnostic.CA1031.severity = warning  # Do not catch general exception types
dotnet_diagnostic.CA2007.severity = none     # Do not directly await a Task
dotnet_diagnostic.IDE0063.severity = suggestion  # Use simple 'using' statement

# Async
dotnet_diagnostic.RCS1090.severity = warning  # Add call to ConfigureAwait
```

## Java (Checkstyle)

### checkstyle.xml
```xml
<?xml version="1.0"?>
<!DOCTYPE module PUBLIC
    "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN"
    "https://checkstyle.org/dtds/configuration_1_3.dtd">

<module name="Checker">
    <module name="TreeWalker">
        <!-- Naming Conventions -->
        <module name="ConstantName"/>
        <module name="LocalFinalVariableName"/>
        <module name="LocalVariableName"/>
        <module name="MemberName"/>
        <module name="MethodName"/>
        <module name="PackageName"/>
        <module name="ParameterName"/>
        <module name="StaticVariableName"/>
        <module name="TypeName"/>

        <!-- Size Violations -->
        <module name="MethodLength">
            <property name="max" value="50"/>
        </module>
        <module name="ParameterNumber">
            <property name="max" value="5"/>
        </module>

        <!-- Whitespace -->
        <module name="EmptyForIteratorPad"/>
        <module name="GenericWhitespace"/>
        <module name="MethodParamPad"/>
        <module name="NoWhitespaceAfter"/>
        <module name="NoWhitespaceBefore"/>
        <module name="OperatorWrap"/>
        <module name="ParenPad"/>
        <module name="TypecastParenPad"/>
        <module name="WhitespaceAfter"/>
        <module name="WhitespaceAround"/>

        <!-- Coding -->
        <module name="EmptyStatement"/>
        <module name="EqualsHashCode"/>
        <module name="IllegalInstantiation"/>
        <module name="SimplifyBooleanExpression"/>
        <module name="SimplifyBooleanReturn"/>

        <!-- Imports -->
        <module name="AvoidStarImport"/>
        <module name="RedundantImport"/>
        <module name="UnusedImports"/>
    </module>

    <!-- File Length -->
    <module name="FileLength">
        <property name="max" value="300"/>
    </module>

    <!-- Line Length -->
    <module name="LineLength">
        <property name="max" value="120"/>
    </module>
</module>
```

## Go (golangci-lint)

### .golangci.yml
```yaml
run:
  timeout: 5m
  tests: true

linters:
  enable:
    - gofmt
    - golint
    - govet
    - errcheck
    - staticcheck
    - unused
    - gosimple
    - structcheck
    - varcheck
    - ineffassign
    - deadcode
    - typecheck
    - gosec
    - gocyclo
    - dupl
    - misspell

linters-settings:
  gocyclo:
    min-complexity: 10
  dupl:
    threshold: 100
  govet:
    check-shadowing: true
  golint:
    min-confidence: 0.8

issues:
  exclude-use-default: false
  max-issues-per-linter: 0
  max-same-issues: 0
```

## Rust (Clippy)

### .clippy.toml
```toml
# Clippy configuration
msrv = "1.70.0"

# Warn on all clippy lints by default
warn-on-all-wildcard-imports = true

# Specific lint levels
too-many-arguments-threshold = 5
type-complexity-threshold = 250
```

### Cargo.toml (linting section)
```toml
[lints.rust]
unsafe_code = "forbid"
missing_docs = "warn"

[lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"
cargo = "warn"

# Deny specific lints
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
```

## HTML/CSS (stylelint)

### .stylelintrc.json
```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "indentation": 2,
    "string-quotes": "single",
    "color-hex-case": "lower",
    "color-hex-length": "short",
    "selector-max-id": 0,
    "selector-class-pattern": "^[a-z][a-zA-Z0-9]+$",
    "declaration-block-no-duplicate-properties": true,
    "max-nesting-depth": 3,
    "no-duplicate-selectors": true
  }
}
```

## SQL (SQLFluff)

### .sqlfluff
```ini
[sqlfluff]
dialect = postgres
templater = jinja
max_line_length = 100

[sqlfluff:rules]
tab_space_size = 2
indent_unit = space

[sqlfluff:rules:L010]
capitalisation_policy = upper

[sqlfluff:rules:L014]
capitalisation_policy = lower

[sqlfluff:rules:L030]
capitalisation_policy = upper
```

## General Editor Config

### .editorconfig (cross-language)
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,jsx,ts,tsx,json}]
indent_style = space
indent_size = 2

[*.{py}]
indent_style = space
indent_size = 4

[*.{java,cs}]
indent_style = space
indent_size = 4

[*.{go}]
indent_style = tab
indent_size = 4

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

## Pre-commit Hooks

### .pre-commit-config.yaml
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-merge-conflict
      - id: detect-private-key

  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8

  - repo: https://github.com/eslint/eslint
    rev: v8.43.0
    hooks:
      - id: eslint
        files: \.(js|jsx|ts|tsx)$
```

## Severity Levels

### Error (Must Fix)
- Security vulnerabilities
- Syntax errors
- Breaking changes
- Critical bugs

### Warning (Should Fix)
- Code quality issues
- Potential bugs
- Deprecated usage
- Style violations

### Info/Suggestion (Consider Fixing)
- Optimization opportunities
- Alternative approaches
- Minor style preferences

## Custom Rules

Organizations can add custom rules:

```javascript
// Example custom ESLint rule
module.exports = {
  rules: {
    'custom/no-hardcoded-api-urls': {
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && 
                node.value.match(/^https?:\/\//)) {
              context.report({
                node,
                message: 'API URLs should be in configuration, not hardcoded'
              });
            }
          }
        };
      }
    }
  }
};
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run ESLint
        run: npm run lint
      - name: Run Pylint
        run: pylint src/
```

## Disabling Rules

When necessary, document why:

```javascript
// eslint-disable-next-line no-console
console.log('Debug info'); // TODO: Remove before production

/* eslint-disable security/detect-object-injection */
// Justified: keys are validated earlier in the function
const value = obj[key];
/* eslint-enable security/detect-object-injection */
```

## Maintenance

- Review linting rules quarterly
- Update to latest rule sets
- Adjust based on team feedback
- Document rule changes
- Keep configurations in version control
