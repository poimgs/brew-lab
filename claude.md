# Coffee Tracker

A web application for tracking and analyzing coffee brewing experiments.

Read `specs/index.md` for project overview and specifications.

## Specs-Based Workflow

### Before Implementation
1. Check `specs/index.md` for relevant specifications
2. Read all linked specs that apply to the task
3. Follow requirements and design decisions documented

### For Complex Tasks
1. Create implementation plan in `plans/YYYY-MM-DD-task-name.md`
2. Reference relevant specs in the plan
3. Get approval before proceeding
4. Archive/delete plan after completion

### Creating/Updating Specs
- New specs go in appropriate category directory
- Update `specs/index.md` with a new row for new spec: link to spec, link to related code, purpose summary
- Spec format:
  - **Context**: Why this spec exists
  - **Requirements**: What must be true
  - **Design Decisions**: Chosen approach with rationale
  - **Open Questions**: Unresolved items (if any)

## File Organization
```
specs/           # Specifications (categorized)
plans/           # Working implementation plans only (delete when complete)
src/             # Application source (structure TBD)
```
