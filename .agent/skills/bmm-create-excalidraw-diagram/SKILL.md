---
name: create-excalidraw-diagram
description: Create system architecture diagrams, ERDs, UML diagrams, or general technical diagrams in Excalidraw format
---

# create-excalidraw-diagram

## Overview
Create system architecture diagrams, ERDs, UML diagrams, or general technical diagrams in Excalidraw format

## Configuration
- **config_source**: {skill-root}/_config/bmm.yaml
- **output_folder**: {config_source}:output_folder
- **installed_path**: {skill-root}/bmm-create-excalidraw-diagram
- **shared_path**: {skill-root}/_resources/bmm-excalidraw-shared
- **instructions**: {installed_path}/instructions.md
- **validation**: {installed_path}/checklist.md
- **helpers**: {skill-root}/_resources/excalidraw/excalidraw-helpers.md
- **json_validation**: {skill-root}/_resources/excalidraw/validate-json-instructions.md
- **templates**: {shared_path}/excalidraw-templates.yaml
- **library**: {shared_path}/excalidraw-library.json
- **default_output_file**: {output_folder}/excalidraw-diagrams/diagram-{timestamp}.excalidraw

## When to Use
This workflow can be run standalone and is designed for: create system architecture diagrams, erds, uml diagrams, or general technical diagrams in excalidraw format

## Instructions
See instructions at: [instructions.md](instructions.md)

## Supporting Files

### Validation Checklist
- [checklist.md](checklist.md) - Validation checklist for this workflow

  Preview:
  ```
  # Create Diagram - Validation Checklist
## Element Structure
  ```