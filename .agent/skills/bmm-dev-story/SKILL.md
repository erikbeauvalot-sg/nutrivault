---
name: dev-story
description: Execute a story by implementing tasks/subtasks, writing tests, validating, and updating the story file per acceptance criteria
---

# dev-story

## Overview
Execute a story by implementing tasks/subtasks, writing tests, validating, and updating the story file per acceptance criteria

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **user_skill_level**: {config_source}:user_skill_level
- **document_output_language**: {config_source}:document_output_language
- **story_dir**: {config_source}:implementation_artifacts
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-dev-story
- **instructions**: {installed_path}/instructions.xml
- **validation**: {installed_path}/checklist.md
- **story_file**: 
- **implementation_artifacts**: {config_source}:implementation_artifacts
- **sprint_status**: {implementation_artifacts}/sprint-status.yaml
- **project_context**: **/project-context.md

## When to Use
This workflow can be run standalone and is designed for: execute a story by implementing tasks/subtasks, writing tests, validating, and updating the story file per acceptance criteria

## Instructions
See instructions at: [instructions.xml](instructions.xml)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  ---
title: 'Enhanced Dev Story Definition of Done Checklist'
validation-target: 'Story markdown ({{story_path}})'
  ```