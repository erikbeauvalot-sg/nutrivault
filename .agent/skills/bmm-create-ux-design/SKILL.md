---
name: create-ux-design
description: Work with a peer UX Design expert to plan your applications UX patterns, look and feel.
---

# create-ux-design

## Overview
Work with a peer UX Design expert to plan your applications UX patterns, look and feel.



## When to Use
This workflow can be run standalone and is designed for: work with a peer ux design expert to plan your applications ux patterns, look and feel.

## Instructions
### Create UX Design Workflow

**Goal:** Create comprehensive UX design specifications through collaborative visual exploration and informed decision-making where you act as a UX facilitator working with a product stakeholder.

---

#### WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Append-only document building through conversation

---

#### INITIALIZATION

##### Configuration Loading

Load config from `{skill-root}/_config/bmm.yaml` and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime

##### Paths

- `installed_path` = `{skill-root}/bmm-create-ux-design`
- `template_path` = `{installed_path}/ux-design-template.md`
- `default_output_file` = `{planning_artifacts}/ux-design-specification.md`

#### EXECUTION

- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- Load and execute `steps/step-01-init.md` to begin the UX design workflow.


## Supporting Files

### Workflow Step Files

This workflow uses 15 micro-step files for disciplined execution:
- [step-01-init.md](steps/step-01-init.md)
- [step-01b-continue.md](steps/step-01b-continue.md)
- [step-02-discovery.md](steps/step-02-discovery.md)
- [step-03-core-experience.md](steps/step-03-core-experience.md)
- [step-04-emotional-response.md](steps/step-04-emotional-response.md)
- [step-05-inspiration.md](steps/step-05-inspiration.md)
- [step-06-design-system.md](steps/step-06-design-system.md)
- [step-07-defining-experience.md](steps/step-07-defining-experience.md)
- [step-08-visual-foundation.md](steps/step-08-visual-foundation.md)
- [step-09-design-directions.md](steps/step-09-design-directions.md)
- [step-10-user-journeys.md](steps/step-10-user-journeys.md)
- [step-11-component-strategy.md](steps/step-11-component-strategy.md)
- [step-12-ux-patterns.md](steps/step-12-ux-patterns.md)
- [step-13-responsive-accessibility.md](steps/step-13-responsive-accessibility.md)
- [step-14-complete.md](steps/step-14-complete.md)