---
name: bootstrap-bmad-skills
description: Bootstrap and install BMAD-METHOD skills for Claude Code, Cursor, Antigravity, and other tools.
---

# Bootstrap BMAD Skills

## Commands

- **`BS`** or **`bootstrap-skills`** - Start the bootstrap workflow

---

## When You Run BS (Guided Flow)

Follow these phases in order. The SAME steps apply whether installing to 1 tool or multiple tools.

### Phase 1: Gather Information

**Step 1 - Tool Selection:** Ask which tool(s) the user is using. Multiple selections allowed:

- [ ] Cursor
- [ ] Antigravity
- [ ] Claude Code
- [ ] Other (specify)

**Step 2 - Scope Selection:** For EACH selected tool, ask:

- [ ] Project-specific (skills in current project only)
- [ ] Global (skills available in all projects)

**Step 3 - Configuration:** Ask each setting, offer defaults:

| Setting | Question | Default |
|---------|----------|---------|
| `user_name` | What should agents call you? | BMad |
| `communication_language` | Language for AI chat? | English |
| `document_output_language` | Language for documents? | English |
| `output_folder` | Where to save output files? | `_bmad-output` |
| `project_name` | What is your project called? | *(directory name)* |
| `user_skill_level` | Your development experience? | `intermediate` |
| `planning_artifacts` | Where to store planning docs? | `{output_folder}/planning-artifacts` |
| `implementation_artifacts` | Where to store implementation docs? | `{output_folder}/implementation-artifacts` |
| `project_knowledge` | Where to store project knowledge? | `docs` |

If user says "use defaults", skip individual questions and use all defaults.

### Phase 2: Confirm

Summarize the plan showing:

1. Each tool + scope + resolved `{skill-root}` path
2. Configuration values to apply
3. Exact commands to run

**Wait for explicit "yes" or confirmation before proceeding.**

### Phase 3: Execute (Unified Steps)

**IMPORTANT:** Use these SAME steps for 1 tool or multiple tools. No branching.

**Step A - Convert once:**

```bash
npx @clfhhc/bmad-methods-skills --output-dir .temp/converted-skills
```

Wait for this to complete before proceeding.

**Step B - Install to EACH tool:**

For each tool+scope the user selected, run:

```bash
npx @clfhhc/bmad-methods-skills install --from=.temp/converted-skills --tool=[TOOL] [--scope=global] --force
```

Replace `[TOOL]` with: `cursor`, `antigravity`, or `claude`

Include `--scope=global` only if user chose global scope for that tool.

**Step C - Cleanup:**

```bash
rm -rf .temp
```

### Phase 4: Update Configuration

For EACH `{skill-root}` (one per tool installed), update the config files with user's answers:

**Update `{skill-root}/_config/core.yaml`:**

```yaml
user_name: '[user_name value]'
communication_language: [communication_language value]
document_output_language: [document_output_language value]
output_folder: "[output_folder value]"
```

**Update `{skill-root}/_config/bmm.yaml`:**

```yaml
project_name: '[project_name value]'
user_skill_level: [user_skill_level value]
planning_artifacts: "[planning_artifacts value]"
implementation_artifacts: "[implementation_artifacts value]"
project_knowledge: "[project_knowledge value]"

# Inherited core values
user_name: '[user_name value]'
communication_language: [communication_language value]
document_output_language: [document_output_language value]
output_folder: "[output_folder value]"
```

### Phase 5: Verify

For each installed tool, confirm:

1. Skills directory exists with skill folders (e.g., `bmm-analyst/SKILL.md`)
2. `{skill-root}/_config/core.yaml` exists with user's values
3. `{skill-root}/_config/bmm.yaml` exists with user's values

Report results to user.

---

## Skill Root Reference

`{skill-root}` resolves to different paths based on tool and scope:

| Tool | Project Scope | Global Scope |
|------|---------------|--------------|
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/` |
| **Antigravity** | `.agent/skills/` | `~/.gemini/antigravity/skills/` |
| **Claude Code** | `.claude/skills/` | `~/.claude/skills/` |

**Important:** Config files MUST be inside `{skill-root}/_config/`, NOT at project root.

---

## Quick Start (Unattended)

Skip prompts and use defaults. Replace `[TOOL]` with `cursor`, `antigravity`, or `claude`.

```bash
npx @clfhhc/bmad-methods-skills --output-dir .temp/converted-skills && \
npx @clfhhc/bmad-methods-skills install --from=.temp/converted-skills --tool=[TOOL] --force && \
rm -rf .temp
```

*Omit `--tool` to auto-detect. Add `--scope=global` for global.*

After installation, run **BS** to configure settings, or manually edit `{skill-root}/_config/core.yaml` and `{skill-root}/_config/bmm.yaml`.

---

## Guidelines

- **Always confirm** before executing installation commands
- **Offer defaults** - don't force user to answer every question
- **No branching** - use the same convert+install steps for 1 or many tools
- **Handle errors gracefully** - if a command fails, report it and continue if possible
- **Verify installation** - always check that config files exist in the correct location
