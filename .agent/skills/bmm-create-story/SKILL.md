---
name: create-story
description: Create the next user story from epics+stories with enhanced context analysis and direct ready-for-dev marking
---

# create-story

## Overview
Create the next user story from epics+stories with enhanced context analysis and direct ready-for-dev marking

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **date**: system-generated
- **planning_artifacts**: {config_source}:planning_artifacts
- **implementation_artifacts**: {config_source}:implementation_artifacts
- **output_folder**: {implementation_artifacts}
- **story_dir**: {implementation_artifacts}
- **installed_path**: {skill-root}/bmm-create-story
- **template**: {installed_path}/template.md
- **instructions**: {installed_path}/instructions.xml
- **validation**: {installed_path}/checklist.md
- **variables**: {"sprint_status":"{implementation_artifacts}/sprint-status.yaml","epics_file":"{planning_artifacts}/epics.md","prd_file":"{planning_artifacts}/prd.md","architecture_file":"{planning_artifacts}/architecture.md","ux_file":"{planning_artifacts}/*ux*.md","story_title":""}
- **project_context**: **/project-context.md
- **default_output_file**: {story_dir}/{{story_key}}.md
- **input_file_patterns**: {"prd":{"description":"PRD (fallback - epics file should have most content)","whole":"{planning_artifacts}/*prd*.md","sharded":"{planning_artifacts}/*prd*/*.md","load_strategy":"SELECTIVE_LOAD"},"architecture":{"description":"Architecture (fallback - epics file should have relevant sections)","whole":"{planning_artifacts}/*architecture*.md","sharded":"{planning_artifacts}/*architecture*/*.md","load_strategy":"SELECTIVE_LOAD"},"ux":{"description":"UX design (fallback - epics file should have relevant sections)","whole":"{planning_artifacts}/*ux*.md","sharded":"{planning_artifacts}/*ux*/*.md","load_strategy":"SELECTIVE_LOAD"},"epics":{"description":"Enhanced epics+stories file with BDD and source hints","whole":"{planning_artifacts}/*epic*.md","sharded":"{planning_artifacts}/*epic*/*.md","load_strategy":"SELECTIVE_LOAD"}}

## When to Use
This workflow can be run standalone and is designed for: create the next user story from epics+stories with enhanced context analysis and direct ready-for-dev marking

## Instructions
See instructions at: [instructions.xml](instructions.xml)

## Supporting Files

### Document Template
- [template.md](template.md) - Document template for this workflow

  Preview:
  ```
  # Story {{epic_num}}.{{story_num}}: {{story_title}}
Status: ready-for-dev
  ```

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # 🎯 Story Context Quality Competition Prompt
## **🔥 CRITICAL MISSION: Outperform and Fix the Original Create-Story LLM**
  ```