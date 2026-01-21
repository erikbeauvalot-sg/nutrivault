---
name: testarch-atdd
description: Generate failing acceptance tests before implementation using TDD red-green-refactor cycle
---

# testarch-atdd

## Overview
Generate failing acceptance tests before implementation using TDD red-green-refactor cycle

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-testarch-atdd
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **template**: {installed_path}/atdd-checklist-template.md
- **variables**: {"test_dir":"{project-root}/tests"}
- **default_output_file**: {output_folder}/atdd-checklist-{story_id}.md
- **required_tools**: ["read_file","write_file","create_directory","list_files","search_repo"]
- **tags**: ["qa","atdd","test-architect","tdd","red-green-refactor"]
- **execution_hints**: {"interactive":false,"autonomous":true,"iterative":true}

## When to Use
This workflow can be run standalone and is designed for: generate failing acceptance tests before implementation using tdd red-green-refactor cycle

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # ATDD Workflow Validation Checklist
Use this checklist to validate that the ATDD workflow has been executed correctly and all deliverables meet quality standards.
  ```