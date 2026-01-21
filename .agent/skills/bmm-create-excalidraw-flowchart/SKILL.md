---
name: create-excalidraw-flowchart
description: Create a flowchart visualization in Excalidraw format for processes, pipelines, or logic flows
---

# create-excalidraw-flowchart

## Overview
Create a flowchart visualization in Excalidraw format for processes, pipelines, or logic flows

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **installed_path**: {skill-root}/bmm-create-excalidraw-flowchart
- **shared_path**: {skill-root}/_resources/bmm-excalidraw-shared
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **helpers**: {skill-root}/_resources/excalidraw/excalidraw-helpers.md
- **json_validation**: {skill-root}/_resources/excalidraw/validate-json-instructions.md
- **templates**: {shared_path}/excalidraw-templates.yaml
- **library**: {shared_path}/excalidraw-library.json
- **default_output_file**: {output_folder}/excalidraw-diagrams/flowchart-{timestamp}.excalidraw

## When to Use
This workflow can be run standalone and is designed for: create a flowchart visualization in excalidraw format for processes, pipelines, or logic flows

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Create Flowchart - Validation Checklist
## Element Structure
  ```