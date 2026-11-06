---
name: "speckit-validate"
description: "Reconcile the active task's checklist, scan for secrets, and commit the changes in each affected repository without asking for approval."
argument-hint: "Optional feature directory"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "club-management"
  source: "constitution, Principle V, step 3"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

If a feature directory is given above, use it as `FEATURE_DIR`. Otherwise read it from
`.specify/feature.json`. Stop if there is none, or if `FEATURE_DIR/tasks.md` does not exist.

## Purpose

Step 3 of the cycle in Principle V of `.specify/memory/constitution.md`. Running this command is
the approval to commit, so do NOT ask for confirmation and do NOT list changed files or diffs for
review. Commit only. Do not push.

## Outline

1. **Reconcile the checklist** in `FEATURE_DIR/tasks.md`:
   - Check each task against the code. Mark it `[X]` only if the work is really there, and change
     `[X]` back to `[ ]` if it is not.
   - For each task left open, append the reason to its line: `— Omitted: [reason]`.
   - Do not edit files in `FEATURE_DIR/checklists/`.

2. **Find the affected repositories.** Take the projects from `FEATURE_DIR/plan.md` and `tasks.md`
   and run `git -C [project] status --porcelain` in each one.
   - Always use `git -C [project]`, because each project in `apps/` and `services/` is its own repository.
   - The root of the workspace is the `club-management-ai` repository. It versions `specs/`, `.specify/`,
     `.claude/`, `e2e/` and `servers/`, and it is always affected, because `tasks.md` changes.
   - Never run `git init`. If a project with changes has no `.git`, skip it and report it.
   - Any other repository with no changes is not affected.

3. **Stage only this task's files** in each affected repository, using explicit paths. Do not use
   `git add -A` or `git add .`. Leave files unrelated to the task unstaged and report how many
   there are.

4. **Scan the staged files for secrets** with `git -C [project] diff --cached`, in every repository,
   before any commit:
   - **File names**: `.env`, `.env.*` (except `.env.example`), `.secrets.env`, `*.pem`, `*.key`, `*.p12`, `*.pfx`,
     `id_rsa*`, `credentials*`, `secrets*`.
   - **Added lines**: private key blocks, cloud or API tokens (such as `AKIA...`, `ghp_...`,
     `sk-...`), and hardcoded `password`, `secret` or `token` values. Placeholders and references
     to environment variables do not count.

   If anything is found, unstage it, commit nothing in any repository, name the file and the kind of
   secret, and stop. Do not print the secret itself. Finding one is the only reason to name files
   in this command's output.

5. **Commit in each affected repository:**
   - **Branch**: every repository MUST use a branch named `[feature-directory-name]`, because the
     pipeline in `club-management-ai` finds each project's code by that name and falls back to `main`.
     If the repository is on its default branch (`main` or `master`), run
     `git -C [project] switch -c [feature-directory-name]` first. If it is on any other branch, leave
     that repository uncommitted and report it.
   - **Message**: Conventional Commits in English, with the project as the scope. For example,
     `feat(club-management-client): add shared button with storybook`.
   - Never use `--no-verify`. If a hook fails, leave that repository uncommitted, report the
     failure, and continue with the others.

   - Commit the projects first and the root last, because the root commit includes `commits.md`.

6. **Record the commits** in `FEATURE_DIR/commits.md`, which `/speckit-complete` reads. Add one row
   per project repository. The root does not need a row, since it cannot record its own commit:

   ```markdown
   | Repository | Branch | Commit |
   |------------|--------|--------|
   | services/club-management-users-svc | 001-user-profile | abc1234 |
   ```

7. **Report** tasks done and omitted, plus the branch and short hash for each repository, without
   file lists. Also report repositories skipped or failed. The next step is `/speckit-complete`.
