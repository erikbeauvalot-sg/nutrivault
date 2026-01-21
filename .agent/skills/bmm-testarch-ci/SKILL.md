---
name: testarch-ci
description: Scaffold CI/CD quality pipeline with test execution, burn-in loops, and artifact collection
---

# testarch-ci

## Overview
Scaffold CI/CD quality pipeline with test execution, burn-in loops, and artifact collection

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-testarch-ci
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **variables**: {"ci_platform":"auto","test_dir":"{project-root}/tests"}
- **default_output_file**: {project-root}/.github/workflows/test.yml
- **required_tools**: ["read_file","write_file","create_directory","list_files","search_repo"]
- **tags**: ["qa","ci-cd","test-architect","pipeline","automation"]
- **execution_hints**: {"interactive":false,"autonomous":true,"iterative":true}

## When to Use
This workflow can be run standalone and is designed for: scaffold ci/cd quality pipeline with test execution, burn-in loops, and artifact collection

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # CI/CD Pipeline Setup - Validation Checklist
## Prerequisites
  ```