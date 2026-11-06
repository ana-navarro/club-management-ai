---
name: "speckit-merge-main"
description: "Merge a branch into main in every repository that has it, after its CI passes, and push main."
argument-hint: "Branch name"
compatibility: "Requires spec-kit project structure with .specify/ directory and the gh CLI"
metadata:
  author: "club-management"
  source: "constitution, Comandos de Workflow Speckit"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

The text above is the branch name. Stop and ask for it if it is empty. Stop if it is `main`, or if
`git check-ref-format --branch "[branch]"` rejects it.

## Purpose

Running this command is the approval to merge this branch and push `main`. Do not merge or push
anything else. Never force push, and do not delete the branch.

## Outline

1. **Find the repositories.** Check the root (`club-management-ai`) and each project in `apps/` and
   `services/`. Run `git -C [repo] fetch origin`. A repository is affected if `origin/[branch]` exists.
   Stop if none has it.

2. **Check every affected repository before merging anything**, and report all the problems found:
   - The working tree is clean (`git -C [repo] status --porcelain` is empty).
   - The latest commit of `origin/[branch]` has GitHub Actions runs, and all of them finished with
     `success`. List them from inside the repository with
     `gh run list --commit [sha] --json name,status,conclusion,url`. Do not wait for runs in progress:
     report them and stop.
   - `git -C [repo] merge-tree --write-tree origin/main origin/[branch]` exits with 0. Any other exit
     code means a conflict. Do not resolve conflicts here.

   If any check fails, stop without merging in any repository.

3. **Merge and push**, with the projects first and the root last, because the root's pipeline checks
   the `main` branch of each project:

   ```text
   git -C [repo] switch main
   git -C [repo] pull --ff-only origin main
   git -C [repo] merge --no-ff origin/[branch] -m "chore(merge): merge [branch] into main"
   git -C [repo] push origin main
   ```

   Skip a repository if `origin/[branch]` is already in `main`, and report it. If a step fails, run
   `git -C [repo] merge --abort` if a merge is in progress, stop, and report which repositories were
   already merged and which were not. Do not revert the ones already merged.

4. **Wait for GitHub Actions** on the new `main` commit of each repository, as `/speckit-complete` does.

5. **Report** each repository's merge commit and CI result, plus any repository skipped. If a pipeline
   on `main` fails, give the link and the failing step, and do not revert anything.
