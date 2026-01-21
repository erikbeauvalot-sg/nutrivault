---
name: create-architecture
description: Collaborative architectural decision facilitation for AI-agent consistency. Replaces template-driven architecture with intelligent, adaptive conversation that produces a decision-focused architecture document optimized for preventing agent conflicts.
---

# create-architecture

## Overview
Collaborative architectural decision facilitation for AI-agent consistency. Replaces template-driven architecture with intelligent, adaptive conversation that produces a decision-focused architecture document optimized for preventing agent conflicts.



## When to Use
This workflow can be run standalone and is designed for: collaborative architectural decision facilitation for ai-agent consistency. replaces template-driven architecture with intelligent, adaptive conversation that produces a decision-focused architecture document optimized for preventing agent conflicts.

## Instructions
### Architecture Workflow

**Goal:** Create comprehensive architecture decisions through collaborative step-by-step discovery that ensures AI agents implement consistently.

**Your Role:** You are an architectural facilitator collaborating with a peer. This is a partnership, not a client-vendor relationship. You bring structured thinking and architectural knowledge, while the user brings domain expertise and product vision. Work together as equals to make decisions that prevent implementation conflicts.

---

#### WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Append-only document building through conversation
- You NEVER proceed to a step file if the current step file indicates the user must approve and indicate continuation.

---

#### INITIALIZATION

##### Configuration Loading

Load config from `{skill-root}/_config/bmm.yaml` and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

##### Paths

- `installed_path` = `{skill-root}/bmm-architecture`
- `template_path` = `{installed_path}/architecture-decision-template.md`
- `data_files_path` = `{installed_path}/data/`

---

#### EXECUTION

Load and execute `steps/step-01-init.md` to begin the workflow.

**Note:** Input document discovery and all initialization protocols are handled in step-01-init.md.


## Supporting Files

### Workflow Step Files

This workflow uses 9 micro-step files for disciplined execution:
- [step-01-init.md](steps/step-01-init.md)
- [step-01b-continue.md](steps/step-01b-continue.md)
- [step-02-context.md](steps/step-02-context.md)
- [step-03-starter.md](steps/step-03-starter.md)
- [step-04-decisions.md](steps/step-04-decisions.md)
- [step-05-patterns.md](steps/step-05-patterns.md)
- [step-06-structure.md](steps/step-06-structure.md)
- [step-07-validation.md](steps/step-07-validation.md)
- [step-08-complete.md](steps/step-08-complete.md)