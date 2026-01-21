---
name: generate-project-context
description: Creates a concise project-context.md file with critical rules and patterns that AI agents must follow when implementing code. Optimized for LLM context efficiency.
---

# generate-project-context

## Overview
Creates a concise project-context.md file with critical rules and patterns that AI agents must follow when implementing code. Optimized for LLM context efficiency.



## When to Use
This workflow can be run standalone and is designed for: creates a concise project-context.md file with critical rules and patterns that ai agents must follow when implementing code. optimized for llm context efficiency.

## Instructions
### Generate Project Context Workflow

**Goal:** Create a concise, optimized `project-context.md` file containing critical rules, patterns, and guidelines that AI agents must follow when implementing code. This file focuses on unobvious details that LLMs need to be reminded of.

**Your Role:** You are a technical facilitator working with a peer to capture the essential implementation rules that will ensure consistent, high-quality code generation across all AI agents working on the project.

---

#### WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Focus on lean, LLM-optimized content generation
- You NEVER proceed to a step file if the current step file indicates the user must approve and indicate continuation.

---

#### INITIALIZATION

##### Configuration Loading

Load config from `{skill-root}/_config/bmm.yaml` and resolve:

- `project_name`, `output_folder`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

##### Paths

- `installed_path` = `{skill-root}/bmm-generate-project-context`
- `template_path` = `{installed_path}/project-context-template.md`
- `output_file` = `{output_folder}/project-context.md`

---

#### EXECUTION

Load and execute `steps/step-01-discover.md` to begin the workflow.

**Note:** Input document discovery and initialization protocols are handled in step-01-discover.md.


## Supporting Files

### Workflow Step Files

This workflow uses 3 micro-step files for disciplined execution:
- [step-01-discover.md](steps/step-01-discover.md)
- [step-02-generate.md](steps/step-02-generate.md)
- [step-03-complete.md](steps/step-03-complete.md)