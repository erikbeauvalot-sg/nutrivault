---
name: workflow-status
description: Lightweight status checker - answers "what should I do now?" for any agent. Reads YAML status file for workflow tracking. Use workflow-init for new projects.
---

# workflow-status

## Overview
Lightweight status checker - answers "what should I do now?" for any agent. Reads YAML status file for workflow tracking. Use workflow-init for new projects.

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **planning_artifacts**: {config_source}:planning_artifacts
- **implementation_artifacts**: {config_source}:implementation_artifacts
- **user_name**: {config_source}:user_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **user_skill_level**: {config_source}:user_skill_level
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-workflow-status
- **instructions**: {installed_path}/instructions.md
- **template**: {installed_path}/workflow-status-template.yaml
- **path_files**: {installed_path}/paths/
- **default_output_file**: {planning_artifacts}/bmm-workflow-status.yaml

## When to Use
This workflow can be run standalone and is designed for: lightweight status checker - answers "what should i do now?" for any agent. reads yaml status file for workflow tracking. use workflow-init for new projects.

## Instructions
See instructions at: [instructions.md](instructions.md)