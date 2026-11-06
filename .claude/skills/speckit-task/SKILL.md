---
name: "speckit-task"
description: "Plan a task in one step: create specs/[###-feature] with a plan and a checklist of ports, usecases, adapters, routes, components, stories and tests, ready for /speckit-implement."
argument-hint: "Description of the task"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "club-management"
  source: "constitution, Principle V, step 1"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

The text above is the task description.

## Purpose

Step 1 of the cycle in Principle V of `.specify/memory/constitution.md`. It writes planning
artifacts only: do not change code in any project, and do not commit or push.

## Outline

1. **Check the requirements.** Stop and ask for detail if the description is empty or vague: you
   cannot tell who uses the feature, what it must do, or which projects it touches. Ask only what
   is missing, then wait for the answer. Do not create anything before the requirements are clear.

2. **Load context.** Read `.specify/memory/constitution.md`. It defines the project folders, the
   hexagonal backend layers, the frontend structure and the test rules used below. Inspect the
   affected projects enough to use real paths and existing code.

3. **Create the feature directory.**
   - Choose a 2-4 word kebab-case short name.
   - Use the next free 3-digit prefix found in `specs/` (`001` if there is none), giving
     `specs/[###-short-name]`.
   - Write the path to `.specify/feature.json` as `{ "feature_directory": "specs/[###-short-name]" }`.

4. **Write `spec.md`.** Keep it brief: goal, who it is for, what is in and out of scope, and
   acceptance criteria that can be tested.

5. **Write `plan.md`.** `/speckit-implement` requires this file and stops if it is missing or empty.
   Include:
   - **Summary**: the approach in a few lines.
   - **Affected projects**: each project's path, as listed in Principle I.
   - **Constitution Check**: each principle that applies, marked pass or justified as a violation.

6. **Write `tasks.md`.** Group tasks by project, then by layer or frontend module, and leave out
   any group that does not apply:

   ```markdown
   # Tasks: [feature name]

   ## services/[project]

   ### domain/ports
   ### domain/usecases
   ### domain/models
   ### infra/adapters
   ### infra/schemas
   ### application/dto
   ### application/controllers
   ### application/routes
   ### application/middlewares
   ### config
   ### tests

   ## apps/[project]

   ### src/shared/components (with .stories.tsx)
   ### src/shared (hooks, services, theme, utils)
   ### src/pages/[PageName] (components, services, hooks, contexts, reducers, index.tsx)
   ### stories
   ### tests

   ## e2e/[project]

   ### Cypress flows (mobile viewport)
   ```

   Every task MUST use this format, with a unique sequential ID and an exact file path from the
   root of the workspace:

   ```text
   - [ ] T001 Create send-email-adapter in services/[project]/src/infra/adapters/send-email-adapter.ts
   ```

   Add `[P]` after the ID for tasks that can run in parallel. Tests are always included, because
   Principle III requires 90% line coverage and fails the pipeline without tests. Backend file names
   MUST follow `[verb]-[feature]-[type]`, with `_` instead of `-` in Python, and one adapter per action.

7. **Report** the feature directory, the affected projects and the number of tasks. The next step
   is `/speckit-implement`.
