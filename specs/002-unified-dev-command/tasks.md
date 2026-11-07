# Tasks: Comando único para executar o ambiente de desenvolvimento

**Input**: Design documents from `specs/002-unified-dev-command/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dev-command.md, quickstart.md

**Tests**: Incluídos, porque o Princípio III da constituição exige cobertura mínima de 90% das linhas e reprova a pipeline sem testes.

**Organization**: Por user story. Todas as tarefas são no repositório `club-management-ai`, e nenhum projeto de `apps/` ou `services/` muda, a menos que a validação da Phase 8 revele um problema de hot reload.

## Phase 1: Setup

**Purpose**: Criar os pontos de entrada e o comando de testes.

- [X] T001 Create package.json at the workspace root, private and without dependencies, with the scripts `dev` (`node servers/club-management-server/scripts/dev.mjs up`), `dev:down` (`... dev.mjs down`), `dev:logs` (`... dev.mjs logs`) and `test:scripts` (`node --test --experimental-test-coverage --test-coverage-lines=90 --test-coverage-exclude="**/*.test.mjs" servers/club-management-server/scripts/`)
- [X] T002 Create servers/club-management-server/scripts/dev.mjs that reads the subcommand and the `--detach` flag, calls the functions from dev-commands.mjs, sets the process exit code, and prints the usage for an unknown subcommand
- [X] T003 [P] Create .claude/skills/run-server/SKILL.md for `/run-server`, which runs `npm run dev -- --detach` at the workspace root and reports the addresses it prints

---

## Phase 2: Foundational

**Purpose**: Verificações de saúde e volumes que todas as stories usam.

**CRITICAL**: Nenhuma story termina antes desta fase.

- [X] T004 [P] Create servers/club-management-server/scripts/check-https-health.cjs that calls `https://localhost:$PORT/health` with `/certs/ca.crt`, `/certs/tls.crt` and `/certs/tls.key`, exiting 0 only on HTTP 200
- [X] T005 [P] Create servers/club-management-server/scripts/check_https_health.py that calls `https://localhost:8000/health` with the same certificates, using only the Python standard library, exiting 0 only on HTTP 200
- [X] T006 Mount servers/club-management-server/scripts read-only at `/healthcheck` in users-svc, client-bff and admin-bff in servers/club-management-server/docker-compose.yml
- [X] T007 Add a healthcheck with `interval: 5s` and `retries: 120` to users-svc and both BFFs, using the scripts from T004 and T005, in servers/club-management-server/docker-compose.yml
- [X] T008 Add a healthcheck with `interval: 5s` and `retries: 120` to client, admin, scheduling-svc, payment-svc and championshp-svc, using `node -e` with `fetch` on each service's own port, in servers/club-management-server/docker-compose.yml
- [X] T009 Add healthchecks to mongo (`mongosh --quiet --eval "db.adminCommand('ping')"`) and nginx (`wget` on ports 8080 and 8081), in servers/club-management-server/docker-compose.yml
- [X] T010 [P] Add a healthcheck to mailpit using `/mailpit readyz` in servers/club-management-infra/docker-compose.yml
- [X] T011 Change users-svc to depend on mongo with `condition: service_healthy` and mailpit with `condition: service_healthy`, in servers/club-management-server/docker-compose.yml
- [X] T012 Replace the anonymous `/app/node_modules` volumes with one named volume per project (for example `users-svc-node-modules`), declared under `volumes:`, in servers/club-management-server/docker-compose.yml
- [X] T013 Add the named volume `pip-cache` at `/root/.cache/pip` to client-bff and admin-bff in servers/club-management-server/docker-compose.yml
- [X] T014 [P] Comment out `JWT_SECRET` and `SEED_ADMIN_PASSWORD` in servers/club-management-server/.env.example, explaining that the Compose defaults apply when they are not set, because `change-me` broke the login

**Checkpoint**: `docker compose ps` mostra todos os 11 serviços como `healthy`, e o mTLS continua ativo. Se o `users-svc` ou um BFF recusar o próprio certificado, ajuste T004 ou T005 sem abrir exceção ao mTLS.

---

## Phase 3: User Story 1 - Subir tudo com um comando (Priority: P1) 🎯 MVP

**Goal**: `npm run dev` deixa todo o ambiente pronto, sem passos manuais.

**Independent Test**: Com nada em execução, rodar `npm run dev` e entrar no admin com o administrador inicial.

### Tests for User Story 1

- [X] T015 [P] [US1] Test the service decision in servers/club-management-server/scripts/dev-status.test.mjs: `running` and `healthy` is ready; `exited` with code 0 is ready only for the certificates service; any other `exited` fails; `running` and `unhealthy` fails; any other state waits
- [X] T016 [P] [US1] Test the environment decision in servers/club-management-server/scripts/dev-status.test.mjs: failure wins, all expected ready is ready, an expected service missing from the list waits, a line outside the format raises a clear error, and 10 minutes without success fails listing who still waits
- [X] T017 [P] [US1] Test `up` with a fake command runner in servers/club-management-server/scripts/dev-commands.test.mjs: order of checks, `up -d`, waiting and ready message; `--detach` does not follow logs; running it twice issues no destructive command

### Implementation for User Story 1

- [X] T018 [US1] Implement `parseServices` and `decideService` in servers/club-management-server/scripts/dev-status.mjs, reading `docker compose ps -a --format json` with the fields `Service`, `State`, `Health` and `ExitCode`, and accepting either one JSON array or one object per line
- [X] T019 [US1] Implement `decideEnvironment` in servers/club-management-server/scripts/dev-status.mjs, with the expected services read from `docker compose config --format json`
- [X] T020 [US1] Implement `up` in servers/club-management-server/scripts/dev-commands.mjs: run `docker compose up -d`, check every 2 seconds for up to 10 minutes, and show progress as ready services over total
- [X] T021 [US1] Print the ready message from contracts/dev-command.md in servers/club-management-server/scripts/dev-commands.mjs, with the time taken and the client, admin and test email addresses from the ports in the Compose configuration
- [X] T022 [US1] Replace the `curl` wait in the `Start the stack` step with `npm run dev -- --detach` in .github/workflows/ci.yml, keeping the 10 minute limit and the `ubuntu-22.04` runner

**Checkpoint**: A User Story 1 funciona e é testável sozinha.

---

## Phase 4: User Story 2 - Ver as alterações sem reiniciar (Priority: P1)

**Goal**: Alterações em qualquer dos 8 projetos valem em até 15 segundos.

**Independent Test**: Alterar um arquivo em cada projeto, conforme a seção 2 de quickstart.md, e medir.

- [X] T023 [US2] Confirm that the healthchecks do not restart services during a reload, and that a reload does not change another project, following section 2 of specs/002-unified-dev-command/quickstart.md, and record the time of each of the 8 projects in specs/002-unified-dev-command/hot-reload-check.md
- [X] T024 [US2] Confirm in the browser that the frontends update through ports 8080 and 8081 without a manual reload, and adjust servers/club-management-server/nginx/nginx.conf if the update connection fails
- [X] T025 [US2] Confirm that a syntax error in a service recovers after the fix, as in scenario 3 of User Story 2, and record the result in specs/002-unified-dev-command/hot-reload-check.md

**Checkpoint**: As User Stories 1 e 2 funcionam.

---

## Phase 5: User Story 3 - Saber o que está errado (Priority: P2)

**Goal**: Mensagens claras antes de subir e quando um serviço falha.

**Independent Test**: Renomear a pasta de um projeto, rodar `npm run dev` e conferir a mensagem.

### Tests for User Story 3

- [X] T026 [P] [US3] Test the prerequisites in servers/club-management-server/scripts/dev-checks.test.mjs: Docker stopped, Compose missing, each missing repository, occupied port, ports of the running environment ignored, and every problem listed at once
- [X] T027 [P] [US3] Test failures in servers/club-management-server/scripts/dev-commands.test.mjs: a failed service prints its name and last 50 log lines and returns exit code 2; a failed prerequisite returns exit code 1 and never calls `up`; the kernel explanation appears only when `mongo` fails on kernel 6.19 or newer

### Implementation for User Story 3

- [X] T028 [US3] Implement `checkDocker` in servers/club-management-server/scripts/dev-checks.mjs, using `docker info` and `docker compose version`, with a 10 second limit per command
- [X] T029 [US3] Implement `checkRepositories` in servers/club-management-server/scripts/dev-checks.mjs for the 8 projects, looking for `package.json` or `requirements.txt` and printing the clone command from contracts/dev-command.md
- [X] T030 [US3] Implement `checkPorts` in servers/club-management-server/scripts/dev-checks.mjs, opening each published port and ignoring the ones already used by this environment, naming `CLIENT_PORT`, `ADMIN_PORT` or `MAILPIT_UI_PORT` in the message
- [X] T031 [US3] Call the checks before `up` and print every problem with exit code 1 in servers/club-management-server/scripts/dev-commands.mjs
- [X] T032 [US3] Print the failed service, its code and its last 50 log lines with exit code 2, without stopping the environment, in servers/club-management-server/scripts/dev-commands.mjs
- [X] T033 [US3] Add the SERVER-121912 explanation and link when `mongo` fails and `docker info` reports kernel 6.19 or newer, in servers/club-management-server/scripts/dev-commands.mjs

**Checkpoint**: Os erros de pré-requisito aparecem em até 10 segundos.

---

## Phase 6: User Story 1 e FR-007 - Logs

**Goal**: Acompanhar os logs e identificar o serviço de cada linha.

**Independent Test**: Rodar `npm run dev:logs`, ver os serviços identificados e sair com Ctrl+C, com o ambiente ainda em execução.

- [X] T034 [P] [US1] Test `logs` in servers/club-management-server/scripts/dev-commands.test.mjs: `docker compose logs -f` is called, and Ctrl+C exits with 0 without any stop command
- [X] T035 [US1] Implement `logs`, used by `npm run dev` after the ready message unless `--detach` is set, handling SIGINT so that only log following stops, in servers/club-management-server/scripts/dev-commands.mjs

---

## Phase 7: User Story 4 - Encerrar o ambiente (Priority: P3)

**Goal**: Encerrar tudo com um comando, sem perder dados.

**Independent Test**: Rodar `npm run dev:down` e confirmar que nada continua em execução.

- [X] T036 [P] [US4] Test `down` in servers/club-management-server/scripts/dev-commands.test.mjs: it calls `docker compose down` and never passes `-v` or `--volumes`
- [X] T037 [US4] Implement `down` in servers/club-management-server/scripts/dev-commands.mjs

**Checkpoint**: Todas as stories funcionam de forma independente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T038 Add the step `npm run test:scripts` with Node.js 24 to .github/workflows/server.yml, and add `package.json` to its `paths`
- [X] T039 [P] Delete servers/club-management-server/scripts/up.sh, leaving a single way to start the environment
- [X] T040 [P] Create README.md at the workspace root with the prerequisites, the 4 commands, the addresses, how to change ports and the common problems: Docker stopped, missing repository, occupied port and kernel 6.19 or newer
- [X] T041 Run `npm run test:scripts` and confirm at least 90% line coverage in servers/club-management-server/scripts/
- [ ] T042 Run every scenario of specs/002-unified-dev-command/quickstart.md, and record the times for SC-002, SC-003 and SC-004 in specs/002-unified-dev-command/hot-reload-check.md — Omitted: Ctrl+C during the logs needs an interactive terminal, and macOS was not available
- [X] T043 Run the E2E suites against `npm run dev -- --detach` in e2e/club-management-admin and e2e/club-management-client, confirming that all 40 tests still pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: não depende de nada.
- **Foundational (Phase 2)**: depende da Phase 1 e bloqueia todas as stories.
- **US1 (Phase 3)**: depende da Phase 2. É o MVP.
- **US2 (Phase 4)**: depende da US1, porque a validação usa o ambiente em execução.
- **US3 (Phase 5)**: depende da US1, porque altera o fluxo de `up`.
- **Logs (Phase 6)**: depende da US1.
- **US4 (Phase 7)**: depende apenas da Phase 1 e pode correr em paralelo com as outras.
- **Polish (Phase 8)**: depende de todas.

### Within Each User Story

- Testes antes da implementação, e devem falhar antes de ela existir.
- `dev-status.mjs` antes de `dev-commands.mjs`.
- `dev-commands.mjs` é um arquivo só, então suas tarefas são sequenciais.

### Parallel Opportunities

- Phase 1: T003 em paralelo com T001 e T002.
- Phase 2: T004, T005, T010 e T014, enquanto as tarefas de `docker-compose.yml` são sequenciais.
- US1: T015, T016 e T017, antes da implementação.
- US3: T026 e T027, antes da implementação.
- Phase 8: T039 e T040.

### Parallel Example: User Story 1

```text
T015 Test the service decision in dev-status.test.mjs
T017 Test up with a fake command runner in dev-commands.test.mjs
```

T015 e T016 usam o mesmo arquivo, então só um deles entra em cada lote.

## Implementation Strategy

### MVP First (User Story 1)

1. Concluir as Phases 1 e 2.
2. Concluir a Phase 3.
3. **Parar e validar**: `npm run dev` deixa o login do admin funcionando.

### Incremental Delivery

1. US1 entrega a subida com um comando.
2. US2 comprova o hot reload, que já está configurado.
3. US3 acrescenta as mensagens de erro.
4. Os logs e a US4 completam o ciclo de uso.
5. A Phase 8 integra tudo ao CI e à documentação.

## Notes

- `[P]` significa arquivos diferentes e nenhuma dependência de tarefa incompleta.
- Nenhum comando pode imprimir valores de `.env` ou `.secrets.env`.
- Nenhum comando pode trocar branches, alterar arquivos versionados dos projetos ou apagar volumes.
