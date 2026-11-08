# Quickstart: Login e cadastro do cliente

**Feature**: `003-client-login` | **Plan**: [plan.md](plan.md)

Roteiro para validar a feature de ponta a ponta. Os contratos estão em [contracts/](contracts/) e as regras dos dados, em [data-model.md](data-model.md).

## Pré-requisitos

- Os mesmos do [README](../../README.md): Docker, Node.js 24 e os repositórios clonados.
- Nenhuma credencial é necessária: por padrão, o Google e o Facebook são o provedor simulado.

## Subir o ambiente

```text
npm run dev
```

| Endereço | Uso |
|----------|-----|
| http://localhost:8080 | Sistema do cliente |
| http://localhost:8081 | Sistema do administrador |
| http://localhost:8025 | Emails de teste (Mailpit) |
| http://localhost:8090 | Provedor simulado |

## Testes automáticos

| Projeto | Comando |
|---------|---------|
| `users-svc` | `npm run lint && npm run typecheck && npm run test:coverage` |
| `client-bff` e `admin-bff` | `ruff check . && mypy . && python scripts/run_coverage.py` |
| `club-management-client` | `npm run lint && npm run test:coverage && npm run test:storybook` |
| `oauth-mock` | `pytest` em `servers/club-management-infra/oauth-mock` |
| E2E do cliente | `npx cypress run` em `e2e/club-management-client`, com o ambiente no ar |
| E2E do administrador | `npx cypress run` em `e2e/club-management-admin`, para confirmar que nada mudou (FR-004) |

## Roteiro manual

Faça em 390 px e em 1280 px, nos dois temas e nos dois idiomas.

| # | Passos | Resultado esperado |
|---|--------|--------------------|
| 1 | Abra http://localhost:8080 | Vai para `/login`, com o botão de cadastro e os de Google e Facebook |
| 2 | Cadastre-se com um email novo | Mensagem para conferir o email. Nenhum login acontece |
| 3 | Tente entrar com esse email e a senha | Aviso de email não confirmado, com o botão de reenvio |
| 4 | Abra o email no Mailpit e siga o link | Email confirmado e botão para a página de login |
| 5 | Entre com email e senha | Página inicial |
| 6 | Cadastre-se de novo com o mesmo email, em maiúsculas | A mesma mensagem do passo 2. No Mailpit, chega o aviso de tentativa de cadastro, e nenhuma conta nova é criada |
| 7 | Saia (limpe a sessão) e entre com Google usando o mesmo email | Página inicial, na mesma conta do passo 5 |
| 8 | Faça o mesmo com Facebook | Volta ao login com o aviso para conferir o email, sem sessão. No Mailpit, chega o link com o nome do perfil |
| 8a | Siga o link e clique em Confirmar | Facebook ligado. "Continuar com Facebook" leva à página inicial, na mesma conta |
| 8b | Saia e entre com Facebook de novo | Página inicial direto, sem novo email |
| 8c | Entre com Facebook usando outro email de uma conta existente, siga o link e clique em "Não fui eu" | Nada é ligado. O link deixa de valer, e a conta continua sem o Facebook |
| 9 | Entre com Google usando um email novo | Conta criada e já confirmada. A recuperação de senha define uma senha para ela |
| 10 | No provedor simulado, clique em Cancelar | Volta ao login com a mensagem de cancelamento |
| 11 | No Facebook simulado, marque "não informar o email" | Volta ao login pedindo outro meio de entrada |
| 12 | Entre com Google usando `admin@club-management.local` | A mensagem genérica de credenciais inválidas |
| 12a | Entre com Facebook usando `admin@club-management.local` | O aviso para conferir o email. Nenhum email chega no Mailpit |
| 13 | Cadastre um email com senha, sem confirmar, e entre com Google usando esse email | Entra. A senha cadastrada deixa de funcionar |
| 13a | Repita o passo 13 com o Facebook | Só depois de confirmar o link: a conta fica confirmada e a senha cadastrada deixa de funcionar |
| 14 | Abra http://localhost:8081 | Nenhum botão de cadastro, Google ou Facebook |

## Provedores reais

Só para testar à mão. Copie as variáveis de `.secrets.env` para `servers/club-management-server/.env`, que não é versionado:

```text
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
GOOGLE_AUTHORIZE_URL=https://accounts.google.com/o/oauth2/v2/auth
GOOGLE_TOKEN_URL=https://oauth2.googleapis.com/token
GOOGLE_JWKS_URL=https://www.googleapis.com/oauth2/v3/certs
GOOGLE_ISSUERS=https://accounts.google.com,accounts.google.com
FACEBOOK_APP_ID=…
FACEBOOK_APP_SECRET=…
FACEBOOK_AUTHORIZE_URL=https://www.facebook.com/{versão}/dialog/oauth
FACEBOOK_GRAPH_URL=https://graph.facebook.com
```

Rode `npm run dev:down` e `npm run dev`. Os endereços de retorno cadastrados nos painéis precisam ser:

- `http://localhost:8080/api/auth/google/callback`
- `http://localhost:8080/api/auth/facebook/callback`

No Facebook, a conta usada precisa estar em **Funções do app** enquanto o app estiver no modo de desenvolvimento. Para testar no celular pela rede local, o endereço do computador também precisa estar cadastrado nos dois painéis. O Google só aceita `http` em `localhost`, então pela rede local o teste com o Google real precisa de um túnel `https`.

## Resultado da validação (2026-11-07)

| Verificação | Resultado |
|-------------|-----------|
| `users-svc` | 326 testes, 99% das linhas, lint e tipos sem erros |
| `client-bff` | 62 testes, 99% das linhas, Ruff e mypy sem erros |
| `admin-bff` | 31 testes, 98% das linhas |
| `club-management-client` | 178 testes, 100% das linhas. Storybook: 50 stories sem violação de acessibilidade, nos dois temas |
| `oauth-mock` | 17 testes, Ruff e mypy sem erros |
| Scripts do `npm run dev` | 59 testes |
| E2E do cliente (com o provedor simulado) | 114 de 114 |
| E2E do administrador | 41 de 41 |
| Roteiro manual com o Google e o Facebook reais | Pendente: exige as credenciais de `.secrets.env` e contas reais nos provedores |

Observação: com o React 19, o Cypress digitando muito rápido um texto de mais de ~55 caracteres num campo passa do limite de atualizações aninhadas do React, no cliente e no administrador. Uma pessoa não chega a esse ritmo, então os testes usam emails curtos.
