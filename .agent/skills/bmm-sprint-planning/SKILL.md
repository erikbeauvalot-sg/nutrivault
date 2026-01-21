---
name: sprint-planning
description: Generate and manage the sprint status tracking file for Phase 4 implementation, extracting all epics and stories from epic files and tracking their status through the development lifecycle
---

# sprint-planning

## Overview
Generate and manage the sprint status tracking file for Phase 4 implementation, extracting all epics and stories from epic files and tracking their status through the development lifecycle

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **date**: system-generated
- **implementation_artifacts**: {config_source}:implementation_artifacts
- **planning_artifacts**: {config_source}:planning_artifacts
- **output_folder**: {implementation_artifacts}
- **installed_path**: {skill-root}/bmm-sprint-planning
- **instructions**: {installed_path}/instructions.md
- **template**: {installed_path}/sprint-status-template.yaml
- **validation**: {installed_path}/checklist.md
- **variables**: {"project_context":"**/project-context.md","project_name":"{config_source}:project_name","tracking_system":"file-system","story_location":"{config_source}:implementation_artifacts","story_location_absolute":"{config_source}:implementation_artifacts","epics_location":"{planning_artifacts}","epics_pattern":"epic*.md","status_file":"{implementation_artifacts}/sprint-status.yaml"}
- **input_file_patterns**: {"epics":{"description":"All epics with user stories","whole":"{output_folder}/*epic*.md","sharded":"{output_folder}/*epic*/*.md","load_strategy":"FULL_LOAD"}}
- **default_output_file**: {status_file}

## When to Use
This workflow can be run standalone and is designed for: generate and manage the sprint status tracking file for phase 4 implementation, extracting all epics and stories from epic files and tracking their status through the development lifecycle

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Sprint Planning Validation Checklist
## Core Validation
  ```