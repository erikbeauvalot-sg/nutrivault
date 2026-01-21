---
name: code-review
description: Perform an ADVERSARIAL Senior Developer code review that finds 3-10 specific problems in every story. Challenges everything: code quality, test coverage, architecture compliance, security, performance. NEVER accepts `looks good` - must find minimum issues and can auto-fix with user approval.
---

# code-review

## Overview
Perform an ADVERSARIAL Senior Developer code review that finds 3-10 specific problems in every story. Challenges everything: code quality, test coverage, architecture compliance, security, performance. NEVER accepts `looks good` - must find minimum issues and can auto-fix with user approval.

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **user_skill_level**: {config_source}:user_skill_level
- **document_output_language**: {config_source}:document_output_language
- **date**: system-generated
- **planning_artifacts**: {config_source}:planning_artifacts
- **implementation_artifacts**: {config_source}:implementation_artifacts
- **output_folder**: {implementation_artifacts}
- **sprint_status**: {implementation_artifacts}/sprint-status.yaml
- **installed_path**: {skill-root}/bmm-code-review
- **instructions**: {installed_path}/instructions.xml
- **validation**: {installed_path}/checklist.md
- **template**: false
- **variables**: {"project_context":"**/project-context.md","story_dir":"{implementation_artifacts}"}
- **input_file_patterns**: {"architecture":{"description":"System architecture for review context","whole":"{planning_artifacts}/*architecture*.md","sharded":"{planning_artifacts}/*architecture*/*.md","load_strategy":"FULL_LOAD"},"ux_design":{"description":"UX design specification (if UI review)","whole":"{planning_artifacts}/*ux*.md","sharded":"{planning_artifacts}/*ux*/*.md","load_strategy":"FULL_LOAD"},"epics":{"description":"Epic containing story being reviewed","whole":"{planning_artifacts}/*epic*.md","sharded_index":"{planning_artifacts}/*epic*/index.md","sharded_single":"{planning_artifacts}/*epic*/epic-{{epic_num}}.md","load_strategy":"SELECTIVE_LOAD"}}

## When to Use
This workflow can be run standalone and is designed for: perform an adversarial senior developer code review that finds 3-10 specific problems in every story. challenges everything: code quality, test coverage, architecture compliance, security, performance. never accepts `looks good` - must find minimum issues and can auto-fix with user approval.

## Instructions
See instructions at: [instructions.xml](instructions.xml)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Senior Developer Review - Validation Checklist
- [ ] Story file loaded from `{{story_path}}`
  ```