# Club Management

Workspace do projeto. Cada pasta de `apps/` e `services/` tem repositório próprio, e este repositório guarda as specs, os testes E2E, os servidores e a pipeline integrada.

## Ambiente de desenvolvimento

Um único comando sobe todos os projetos e a infraestrutura, com hot reload.

### Pré-requisitos

- Docker em execução
- Node.js 24
- Os 8 repositórios clonados em `apps/` e `services/`. Se faltar algum, o comando mostra como cloná-lo.

### Comandos

Execute na raiz do workspace:

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Verifica o que falta, sobe tudo, espera ficar pronto e acompanha os logs |
| `npm run dev -- --detach` | Faz o mesmo, sem acompanhar os logs |
| `npm run dev:logs` | Acompanha os logs do ambiente em execução |
| `npm run dev:down` | Encerra tudo e mantém os dados |

Ctrl+C só para de mostrar os logs: o ambiente continua em execução até `npm run dev:down`.

A primeira execução baixa imagens e instala dependências, então leva mais tempo.

### Endereços

| Serviço | Endereço | Variável |
|---------|----------|----------|
| Client | http://localhost:8080 | `CLIENT_PORT` |
| Admin | http://localhost:8081 | `ADMIN_PORT` |
| Emails de teste | http://localhost:8025 | `MAILPIT_UI_PORT` |

Para trocar uma porta, defina a variável em `servers/club-management-server/.env`, usando `.env.example` como base.

### Banco e email

O ambiente usa um MongoDB e um servidor de emails de teste locais. Nenhum email real é enviado, e nada se conecta aos serviços reais.

O administrador inicial é `admin@club-management.local`, com a senha `development-only-password`. Ele só existe no ambiente local.

### Hot reload

As alterações valem sem reiniciar o ambiente e sem reconstruir imagens. Se as dependências de um projeto mudarem, por exemplo depois de um `git pull`, rode `npm run dev:down` e `npm run dev`.

### Problemas comuns

| Mensagem | O que fazer |
|----------|-------------|
| `O Docker não está em execução` | Inicie o Docker e tente de novo |
| `Repositório não encontrado` | Rode o `git clone` mostrado na mensagem |
| `Porta ... em uso` | Libere a porta ou troque a variável citada na mensagem |
| `O serviço mongo falhou`, com citação ao kernel 6.19 | O MongoDB 8.0 em diante pode não iniciar nesse kernel ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)). No WSL, use um kernel anterior até a imagem ser trocada |
| Outro serviço falhou | O comando mostra as últimas linhas do log. Para ver tudo: `npm run dev:logs` |

## Testes do comando

```text
npm run test:scripts
```
