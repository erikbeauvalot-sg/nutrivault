---
name: testarch-nfr
description: Assess non-functional requirements (performance, security, reliability, maintainability) before release with evidence-based validation
---

# testarch-nfr

## Overview
Assess non-functional requirements (performance, security, reliability, maintainability) before release with evidence-based validation

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-testarch-nfr-assess
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **template**: {installed_path}/nfr-report-template.md
- **variables**: {"custom_nfr_categories":""}
- **default_output_file**: {output_folder}/nfr-assessment.md
- **required_tools**: ["read_file","write_file","list_files","search_repo","glob"]
- **tags**: ["qa","nfr","test-architect","performance","security","reliability"]
- **execution_hints**: {"interactive":false,"autonomous":true,"iterative":true}

## When to Use
This workflow can be run standalone and is designed for: assess non-functional requirements (performance, security, reliability, maintainability) before release with evidence-based validation

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Non-Functional Requirements Assessment - Validation Checklist
**Workflow:** `testarch-nfr`
  ```