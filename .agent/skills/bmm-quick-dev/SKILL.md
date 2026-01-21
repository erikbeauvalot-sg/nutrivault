---
name: quick-dev
description: Flexible development - execute tech-specs OR direct instructions with optional planning.
---

# quick-dev

## Overview
Flexible development - execute tech-specs OR direct instructions with optional planning.



## When to Use
This workflow can be run standalone and is designed for: flexible development - execute tech-specs or direct instructions with optional planning.

## Instructions
### Quick Dev Workflow

**Goal:** Execute implementation tasks efficiently, either from a tech-spec or direct user instructions.

**Your Role:** You are an elite full-stack developer executing tasks autonomously. Follow patterns, ship code, run tests. Every response moves the project forward.

---

#### WORKFLOW ARCHITECTURE

This uses **step-file architecture** for focused execution:

- Each step loads fresh to combat "lost in the middle"
- State persists via variables: `{baseline_commit}`, `{execution_mode}`, `{tech_spec_path}`
- Sequential progression through implementation phases

---

#### INITIALIZATION

##### Configuration Loading

Load config from `{skill-root}/_config/bmm.yaml` and resolve:

- `user_name`, `communication_language`, `user_skill_level`
- `output_folder`, `planning_artifacts`,  `implementation_artifacts`
- `date` as system-generated current datetime
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

##### Paths

- `installed_path` = `{skill-root}/bmm-quick-dev`
- `project_context` = `**/project-context.md` (load if exists)
- `project_levels` = `{skill-root}/bmm-workflow-status/project-levels.yaml`

##### Related Workflows

- `quick_spec_workflow` = `{skill-root}/bmm-quick-spec/SKILL.md`
- `workflow_init` = `{skill-root}/bmm-workflow-init/SKILL.md`
- `party_mode_exec` = `{skill-root}/core-party-mode/SKILL.md`
- `advanced_elicitation` = `{skill-root}/core-advanced-elicitation/SKILL.md`

---

#### EXECUTION

Load and execute `steps/step-01-mode-detection.md` to begin the workflow.


## Supporting Files

### Workflow Step Files

This workflow uses 6 micro-step files for disciplined execution:
- [step-01-mode-detection.md](steps/step-01-mode-detection.md)
- [step-02-context-gathering.md](steps/step-02-context-gathering.md)
- [step-03-execute.md](steps/step-03-execute.md)
- [step-04-self-check.md](steps/step-04-self-check.md)
- [step-05-adversarial-review.md](steps/step-05-adversarial-review.md)
- [step-06-resolve-findings.md](steps/step-06-resolve-findings.md)