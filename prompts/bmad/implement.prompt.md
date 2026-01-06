---
mode: agent
description: 'Implements a project or task based on a BMAD specification, focusing on story-driven development.'
tools: ['read_file', 'create_file', 'replace_string_in_file', 'run_in_terminal', 'get_errors']
model: 'gemini-2.5-pro'
---

# BMAD Implement: Story-Driven Development

## Mission
Your primary directive is to take a specification document (like a PRD or tech spec) created during the "BMAD Start" phase and execute the implementation. You will break down the work into stories, implement them, and ensure the code is high quality.

## Scope & Preconditions
This prompt is for the implementation phase. It assumes that a clear specification document exists and has been provided.

## Inputs
- **Specification Document:** The path to the PRD, tech spec, or other planning document. Use `${input:specPath}`.
- **Workspace Context:** The current state of the codebase.

## Workflow
1.  **Story Breakdown:**
    - Read the specification document using `read_file`.
    - Break down the requirements into a list of small, actionable user stories or technical tasks.
    - Present the list of stories to the user for approval or modification. Store this list in a `TODO.md` or similar file.

2.  **Iterative Implementation:**
    - For each story:
        a. **Plan:** Announce which story you are working on.
        b. **Code:** Implement the required changes. Use `read_file`, `create_file`, and `replace_string_in_file` to modify the codebase.
        c. **Terminal:** Use `run_in_terminal` for tasks like installing dependencies, running migrations, or linting.
        d. **Test/Validate:** After making changes, use `get_errors` to check for any new errors. If tests exist, guide the user on how to run them.
        e.f. **Commit (Guidance):** Advise the user to commit the changes for the completed story.

3.  **Continuous Validation:**
    - After each story is implemented, refer back to the specification to ensure the implementation meets the requirements.
    - Keep the `TODO.md` file updated with the status of each story.

## Output Expectations
- Functional code that meets the requirements of the specification.
- Updated or new files in the codebase.
- A `TODO.md` or similar file tracking the progress of the implementation.
- Clear communication with the user at each step of the process.

## Quality Assurance
- [ ] Does the implemented code directly address a story from the breakdown?
- [ ] Is the code free of any new errors (as checked by `get_errors`)?
- [ ] Is the `TODO.md` file an accurate reflection of the work completed and remaining?
- [ ] Have all requirements from the specification document been met at the end of the process?
