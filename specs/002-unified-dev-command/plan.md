# Implementation Plan: Comando único para executar o ambiente de desenvolvimento

**Branch**: `002-unified-dev-command` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-unified-dev-command/spec.md`

## Summary

Um script Node.js sem dependências, em `servers/club-management-server/scripts/`, verifica os pré-requisitos, sobe o `docker-compose.yml` existente, espera todos os serviços ficarem saudáveis, mostra os endereços e acompanha os logs. Um `package.json` na raiz expõe `npm run dev`, `npm run dev:down` e `npm run dev:logs`.

O Compose ganha verificações de saúde e volumes nomeados para as dependências, para que subir de novo seja rápido. O hot reload já está configurado e será comprovado projeto por projeto. A pipeline de E2E passa a usar o próprio comando, então ele é testado de verdade a cada commit.

## Technical Context

**Language/Version**: JavaScript ESM (`.mjs`) em Node.js 24, a mesma versão do projeto

**Primary Dependencies**: Nenhuma além de Node.js e Docker Compose. Testado localmente com Compose 5.5.1

**Storage**: Volumes Docker nomeados; `mongo-data` já existe, e novos volumes guardam dependências

**Testing**: `node --test` com `--experimental-test-coverage --test-coverage-lines=90`; execução real pela pipeline de E2E

**Target Platform**: Windows, Linux e macOS, com Docker em execução

**Project Type**: Ferramenta de linha de comando para desenvolvimento local

**Performance Goals**: Login do admin em até 3 minutos com dependências baixadas; alteração valendo em até 15 segundos; mensagem de pré-requisito em até 10 segundos

**Constraints**: Sem `sh` no host; sem alterar branches ou arquivos versionados dos projetos; mTLS mantido; banco e email locais

**Scale/Scope**: 11 serviços de longa duração e 1 serviço que termina depois de gerar os certificados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação | Observação |
|-----------|----------|------------|
| I. Fronteiras | Passa | O código fica em `/servers/club-management-server`, que a constituição define como lugar dos scripts de subida. O `package.json` da raiz só contém atalhos. Nenhum projeto de `/apps` ou `/services` muda. |
| I. Variáveis de ambiente | Passa | Nenhum `.env` é versionado. O `.env.example` do servidor deixa de sugerir valores que quebram o login. |
| II. Arquitetura e fluxo de dados | Passa | Nenhum fluxo muda. A verificação de saúde do `users-svc` usa mTLS, como qualquer outra chamada interna. |
| II. Tipagem estrita | Não se aplica | A regra vale para TypeScript. O script é JavaScript, sem etapa de compilação, e valida o JSON que lê do Docker. |
| III. Testes | Passa | Cobertura mínima de 90% das linhas do script, na Server Pipeline. A execução real acontece na pipeline integrada. |
| III. Pipelines de `/servers` | Passa | A Server Pipeline ganha os testes do script e dispara também quando o `package.json` da raiz muda. |
| IV. Hot-Reloading | Passa | Esta task comprova o princípio nos 8 projetos, sem reconstruir imagens. |
| V. Ciclo Speckit | Passa | Segue `implement`, `validate` e `complete`. |
| Comandos de utilitários | Passa | Esta task cria `/run-server`, previsto e ainda inexistente. |

**Depois do design**: o resultado continua o mesmo, sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/002-unified-dev-command/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dev-command.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
package.json                          # novo: npm run dev, dev:down, dev:logs
README.md                             # novo: uso, encerramento e problemas comuns
.claude/skills/run-server/SKILL.md    # novo: /run-server chama o mesmo comando
.github/workflows/
├── ci.yml                            # E2E usa o próprio comando
└── server.yml                        # testes do script e novos gatilhos
servers/club-management-server/
├── docker-compose.yml                # verificações de saúde e volumes nomeados
├── .env.example                      # valores opcionais comentados
└── scripts/
    ├── dev.mjs                       # novo: ponto de entrada
    ├── dev-commands.mjs              # novo: up, down e logs
    ├── dev-checks.mjs                # novo: Docker, repositórios e portas
    ├── dev-status.mjs                # novo: lê o estado e decide pronto ou falha
    ├── dev-*.test.mjs                # novos: testes unitários
    ├── check-https-health.cjs        # novo: saúde do users-svc com mTLS
    ├── check_https_health.py         # novo: saúde dos BFFs com mTLS
    ├── generate-certs.sh             # sem mudança
    └── up.sh                         # removido: passa a existir só uma forma de subir
```

**Structure Decision**: toda a lógica fica em `servers/club-management-server/scripts/`, e a raiz só tem atalhos. O ambiente continua sendo o `docker-compose.yml` atual, sem um segundo arquivo.

## Complexity Tracking

Nenhuma violação a justificar.
