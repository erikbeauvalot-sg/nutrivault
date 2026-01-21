---
name: testarch-test-design
description: Dual-mode workflow: (1) System-level testability review in Solutioning phase, or (2) Epic-level test planning in Implementation phase. Auto-detects mode based on project phase.
---

# testarch-test-design

## Overview
Dual-mode workflow: (1) System-level testability review in Solutioning phase, or (2) Epic-level test planning in Implementation phase. Auto-detects mode based on project phase.

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-testarch-test-design
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **template**: {installed_path}/test-design-template.md
- **variables**: {"design_level":"full","mode":"auto-detect"}
- **default_output_file**: {output_folder}/test-design-epic-{epic_num}.md
- **required_tools**: ["read_file","write_file","list_files","search_repo"]
- **tags**: ["qa","planning","test-architect","risk-assessment","coverage"]
- **execution_hints**: {"interactive":false,"autonomous":true,"iterative":true}

## When to Use
This workflow can be run standalone and is designed for: dual-mode workflow: (1) system-level testability review in solutioning phase, or (2) epic-level test planning in implementation phase. auto-detects mode based on project phase.

## Instructions
See instructions at: [instructions.md](instructions.md)

## Outputs
- **0**: System-level testability review (Phase 3)
- **1**: Epic-level test plan (Phase 4)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Test Design and Risk Assessment - Validation Checklist
## Prerequisites
  ```