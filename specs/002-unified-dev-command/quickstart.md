# Quickstart: validar o comando único

## Pré-requisitos

- Docker em execução, Node.js 24 e os 8 repositórios clonados em `apps/` e `services/`.
- Os comandos usam a [interface definida no contrato](contracts/dev-command.md).

## 1. Subir tudo (SC-001, SC-002)

1. Com nada em execução, rode `npm run dev` na raiz.
2. Espere a mensagem de ambiente pronto. **Esperado**: nenhum passo manual, com os 3 endereços na tela.
3. Encerre com `npm run dev:down` e rode `npm run dev` de novo, cronometrando.
4. Abra o admin e entre com o administrador inicial. **Esperado**: login em até 3 minutos.
5. Rode `npm run dev` em outro terminal. **Esperado**: nenhum serviço duplicado.

## 2. Hot reload (SC-003)

Com o ambiente em execução, altere e desfaça um arquivo em cada projeto, medindo o tempo até valer:

| Projeto | O que alterar | Como confirmar |
|---------|---------------|----------------|
| `club-management-admin` | Um texto da página de login | Página em `:8081` muda sem recarregar |
| `club-management-client` | Um texto da página inicial | Página em `:8080` muda sem recarregar |
| `club-management-admin-bff` | O valor devolvido em `/health` | `GET :8081/api/health` |
| `club-management-client-bff` | O valor devolvido em `/health` | `GET :8080/api/health` |
| `club-management-users-svc` | Uma mensagem de log em `main.ts` | Nova linha em `npm run dev:logs` |
| `club-management-scheduling-svc` | Uma mensagem de log em `main.ts` | Nova linha em `npm run dev:logs` |
| `club-management-payment-svc` | Uma mensagem de log em `main.ts` | Nova linha em `npm run dev:logs` |
| `club-management-championshp-svc` | Uma mensagem de log em `main.ts` | Nova linha em `npm run dev:logs` |

**Esperado**: cada alteração vale em até 15 segundos, e os outros projetos não reiniciam.

Salve também um erro de sintaxe em um dos serviços e corrija. **Esperado**: o serviço volta sozinho.

## 3. Mensagens de erro (SC-004)

1. Renomeie a pasta de um projeto e rode `npm run dev`. **Esperado**: a mensagem cita o repositório em até 10 segundos e nada é iniciado. Desfaça.
2. Pare o Docker e rode `npm run dev`. **Esperado**: a mensagem pede para iniciá-lo em até 10 segundos.
3. Ocupe a porta 8081 e rode `npm run dev` com o ambiente encerrado. **Esperado**: a mensagem cita a porta e `ADMIN_PORT`.
4. Salve um erro que impeça um serviço de iniciar e suba do zero. **Esperado**: o serviço é nomeado, com as últimas linhas do log, e o comando sai com 2.

## 4. Encerrar (SC-005)

1. Rode `npm run dev:down`. **Esperado**: `docker compose ps` vazio e portas livres.
2. Suba de novo. **Esperado**: o que foi salvo no banco continua lá.

## 5. Sem `.env` e no CI

1. Sem `servers/club-management-server/.env`, rode `npm run dev`. **Esperado**: login funciona com os valores de desenvolvimento.
2. Na pipeline integrada, os jobs de E2E usam `npm run dev -- --detach`. **Esperado**: os testes do Cypress passam nos 2 jobs.
