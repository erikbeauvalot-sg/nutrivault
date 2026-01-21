---
name: testarch-trace
description: Generate requirements-to-tests traceability matrix, analyze coverage, and make quality gate decision (PASS/CONCERNS/FAIL/WAIVED)
---

# testarch-trace

## Overview
Generate requirements-to-tests traceability matrix, analyze coverage, and make quality gate decision (PASS/CONCERNS/FAIL/WAIVED)

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-testarch-trace
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **template**: {installed_path}/trace-template.md
- **variables**: {"test_dir":"{project-root}/tests","source_dir":"{project-root}/src","coverage_levels":"e2e,api,component,unit","gate_type":"story","decision_mode":"deterministic"}
- **default_output_file**: {output_folder}/traceability-matrix.md
- **required_tools**: ["read_file","write_file","list_files","search_repo","glob"]
- **tags**: ["qa","traceability","test-architect","coverage","requirements","gate","decision","release"]
- **execution_hints**: {"interactive":false,"autonomous":true,"iterative":true}

## When to Use
This workflow can be run standalone and is designed for: generate requirements-to-tests traceability matrix, analyze coverage, and make quality gate decision (pass/concerns/fail/waived)

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Requirements Traceability & Gate Decision - Validation Checklist
**Workflow:** `testarch-trace`
  ```