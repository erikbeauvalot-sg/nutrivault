---
name: testarch-automate
description: Expand test automation coverage after implementation or analyze existing codebase to generate comprehensive test suite
---

# testarch-automate

## Overview
Expand test automation coverage after implementation or analyze existing codebase to generate comprehensive test suite

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-testarch-automate
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **template**: false
- **variables**: {"standalone_mode":true,"coverage_target":"critical-paths","test_dir":"{project-root}/tests","source_dir":"{project-root}/src"}
- **default_output_file**: {output_folder}/automation-summary.md
- **required_tools**: ["read_file","write_file","create_directory","list_files","search_repo","glob"]
- **tags**: ["qa","automation","test-architect","regression","coverage"]
- **execution_hints**: {"interactive":false,"autonomous":true,"iterative":true}

## When to Use
This workflow can be run standalone and is designed for: expand test automation coverage after implementation or analyze existing codebase to generate comprehensive test suite

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Automate Workflow Validation Checklist
Use this checklist to validate that the automate workflow has been executed correctly and all deliverables meet quality standards.
  ```