---
name: testarch-test-review
description: Review test quality using comprehensive knowledge base and best practices validation
---

# testarch-test-review

## Overview
Review test quality using comprehensive knowledge base and best practices validation

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-testarch-test-review
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **template**: {installed_path}/test-review-template.md
- **variables**: {"test_dir":"{project-root}/tests","review_scope":"single"}
- **default_output_file**: {output_folder}/test-review.md
- **required_tools**: ["read_file","write_file","list_files","search_repo","glob"]
- **tags**: ["qa","test-architect","code-review","quality","best-practices"]
- **execution_hints**: {"interactive":false,"autonomous":true,"iterative":true}

## When to Use
This workflow can be run standalone and is designed for: review test quality using comprehensive knowledge base and best practices validation

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Test Quality Review - Validation Checklist
Use this checklist to validate that the test quality review workflow completed successfully and all quality criteria were properly evaluated.
  ```