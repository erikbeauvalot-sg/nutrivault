---
name: testarch-framework
description: Initialize production-ready test framework architecture (Playwright or Cypress) with fixtures, helpers, and configuration
---

# testarch-framework

## Overview
Initialize production-ready test framework architecture (Playwright or Cypress) with fixtures, helpers, and configuration

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-testarch-framework
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **variables**: {"test_dir":"{project-root}/tests","use_typescript":true,"framework_preference":"auto","project_size":"auto"}
- **default_output_file**: {test_dir}/README.md
- **required_tools**: ["read_file","write_file","create_directory","list_files","search_repo"]
- **tags**: ["qa","setup","test-architect","framework","initialization"]
- **execution_hints**: {"interactive":false,"autonomous":true,"iterative":true}

## When to Use
This workflow can be run standalone and is designed for: initialize production-ready test framework architecture (playwright or cypress) with fixtures, helpers, and configuration

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Test Framework Setup - Validation Checklist
This checklist ensures the framework workflow completes successfully and all deliverables meet quality standards.
  ```