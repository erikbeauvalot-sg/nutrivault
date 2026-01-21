---
name: document-project
description: Analyzes and documents brownfield projects by scanning codebase, architecture, and patterns to create comprehensive reference documentation for AI-assisted development
---

# document-project

## Overview
Analyzes and documents brownfield projects by scanning codebase, architecture, and patterns to create comprehensive reference documentation for AI-assisted development

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:project_knowledge
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **user_skill_level**: {config_source}:user_skill_level
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-document-project
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **documentation_requirements_csv**: {installed_path}/documentation-requirements.csv

## When to Use
This workflow can be run standalone and is designed for: analyzes and documents brownfield projects by scanning codebase, architecture, and patterns to create comprehensive reference documentation for ai-assisted development

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Document Project Workflow - Validation Checklist
## Scan Level and Resumability
  ```