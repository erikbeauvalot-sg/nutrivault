---
name: workflow-init
description: Initialize a new BMM project by determining level, type, and creating workflow path
---

# workflow-init

## Overview
Initialize a new BMM project by determining level, type, and creating workflow path

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **implementation_artifacts**: {config_source}:implementation_artifacts
- **planning_artifacts**: {config_source}:planning_artifacts
- **user_name**: {config_source}:user_name
- **project_name**: {config_source}:project_name
- **communication_language**: {config_source}:communication_language
- **document_output_language**: {config_source}:document_output_language
- **user_skill_level**: {config_source}:user_skill_level
- **date**: system-generated
- **installed_path**: {skill-root}/bmm-workflow-init
- **instructions**: {installed_path}/instructions.md
- **template**: {skill-root}/bmm-workflow-status/workflow-status-template.yaml
- **path_files**: {skill-root}/bmm-workflow-status/paths/
- **default_output_file**: {planning_artifacts}/bmm-workflow-status.yaml

## When to Use
This workflow can be run standalone and is designed for: initialize a new bmm project by determining level, type, and creating workflow path

## Instructions
See instructions at: [instructions.md](instructions.md)