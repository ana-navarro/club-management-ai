---
name: "run-server"
description: "Start the whole local environment with hot reload, using the same command people run by hand."
compatibility: "Requires Docker and Node.js 24"
metadata:
  author: "club-management"
  source: "constitution, Comandos de Utilitários"
---

## Purpose

Starts every project in `apps/` and `services/` and the local infrastructure, with hot reload. This
is the same command documented in `README.md`, so there is a single way to start the environment.

## Outline

1. Run `npm run dev -- --detach` at the root of the workspace, as a background command, because the
   first start installs dependencies and can take a few minutes.
2. **Exit code 0:** report the addresses it printed and that `npm run dev:down` stops the environment.
3. **Exit code 1:** report the missing prerequisites as printed. Nothing was started. Do not try to
   install software, start Docker or clone repositories without asking.
4. **Exit code 2:** report the failed service and its logs as printed. The environment stays as it
   is, so it can be investigated. Do not stop it or remove volumes.
