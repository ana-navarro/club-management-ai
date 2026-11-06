---
name: "speckit-complete"
description: "Push the active task's branches in each affected repository, wait for GitHub Actions, and close the task only if every run succeeds."
argument-hint: "Optional feature directory"
compatibility: "Requires spec-kit project structure with .specify/ directory and the gh CLI"
metadata:
  author: "club-management"
  source: "constitution, Principle V, step 4"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

If a feature directory is given above, use it as `FEATURE_DIR`. Otherwise read it from
`.specify/feature.json`. Stop if there is none. Also stop, and point to `/speckit-validate`, if
`FEATURE_DIR/commits.md` does not exist.

## Purpose

Step 4 of the cycle in Principle V of `.specify/memory/constitution.md`. Running this command is
the approval to push the branches listed in `commits.md` and the branch of the same name in the
root repository, `club-management-ai`. Nothing else is pushed.

## Outline

1. **Check each repository**, including the root, before pushing anything:
   - It has an `origin` remote (`git -C [repo] remote get-url origin`).
   - The recorded branch exists and contains the recorded commit.
   - The branch is not the default branch (`main` or `master`).
   - `.github/workflows/` contains at least one workflow. Without one, CI cannot confirm the task.

   If a check fails, stop before any push and report every problem found.

2. **Push** each branch with `git -C [repo] push -u origin [branch]`. Push the projects first and the
   root last, because the root's pipeline looks for the project branches when it starts. Never force
   push. If a push is rejected, stop and report it. Do not rebase or merge to get around it.

3. **Wait for GitHub Actions** in each repository, including the root's integrated pipeline, running
   `gh` from inside that repository:
   - Get the pushed commit with `git -C [repo] rev-parse [branch]`.
   - List its runs with `gh run list --commit [sha] --json databaseId,name,status,conclusion,url`.
     Runs can take a moment to appear, so keep checking for up to 2 minutes.
   - Wait for each run with `gh run watch [id] --exit-status`, using a background command so that
     several repositories can be watched at once.

4. **If any run fails, or no run appears:** do not close the task. Report the repository, the
   workflow, the link and the failing step (`gh run view [id] --log-failed` shows it). Do not
   re-run it or change any code. To finish, fix the problem, run `/speckit-validate`, then run this
   command again.

5. **If every run succeeds, close the task:**
   - Write `FEATURE_DIR/completion.md` with the date and each repository's branch, commit and run link.
   - Create the closing commit, `chore(specs): complete [feature-directory-name]`, in the root
     repository, and push it.

6. **Report** each repository's branch and CI result, and whether the task was closed. Pull requests
   are not part of this command: if the branches still need merging, say so.
