# Plan: Login e cadastro do cliente

**Feature**: `003-client-login` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Artefatos**: [research.md](research.md) · [data-model.md](data-model.md) · [contracts/](contracts/) · [quickstart.md](quickstart.md)

## Summary

Levar ao cliente o login de [001-admin-login](../001-admin-login/plan.md) e acrescentar o cadastro com confirmação de email, a regra de uma conta por email e a entrada com Google e Facebook, no celular e no computador. O `users-svc` ganha o cadastro, a confirmação, a validação dos provedores e a ligação das contas. O `client-bff`, hoje só com `/health`, passa a ter as rotas de autenticação do `admin-bff`, mais o cadastro e os redirecionamentos do OAuth. O `club-management-client` ganha as páginas, com a paleta própria. Um provedor simulado em `/servers/club-management-infra` permite testar tudo sem credenciais.

## Technical Context

**Language/Version**: TypeScript 6 em Node.js 24 (`users-svc`, `club-management-client`), Python 3.14 (`client-bff`, `admin-bff`, `oauth-mock`)

**Primary Dependencies**: as de 001. Novas: `jose` no `users-svc` (JWKS e `id_token`). `i18next`, `react-i18next` e `react-router` no `club-management-client`, como no admin. FastAPI e `cryptography` no `oauth-mock`

**Storage**: MongoDB (Azure DocumentDB nos ambientes publicados), com Mongoose. Coleções em [data-model.md](data-model.md)

**Testing**: Vitest, Supertest e `mongodb-memory-server` no `users-svc`. pytest nos BFFs e no `oauth-mock`. Jest, Testing Library e Storybook Test Runner no frontend. Cypress em viewport mobile em `/e2e/club-management-client`

**Target Platform**: navegadores atuais em celular e computador. Serviços em containers Linux

**Project Type**: aplicação web com micro-serviços em vários repositórios

**Performance Goals**: login e cadastro em até 30 segundos e 2 minutos para a pessoa (SC-001, SC-002). Nenhuma meta de volume nesta task

**Constraints**: nenhuma resposta revela se um email tem conta (FR-009), o tempo de resposta também não. Sem pop-ups. Contraste de 4,5:1 em texto nos dois temas. Sem rolagem horizontal em 390 px

**Scale/Scope**: 7 páginas no cliente, 15 rotas no `client-bff`, 9 rotas novas no `users-svc`, 1 serviço simulado

## Affected projects

| Projeto | O que muda |
|---------|------------|
| `/services/club-management-users-svc` | Cadastro, confirmação, reenvio, OAuth do Google e do Facebook, confirmação por email da primeira entrada pelo Facebook, ligação de contas, limite de cadastros, `X-App-Type`, URLs por sistema, emails novos |
| `/services/club-management-client-bff` | Rotas de autenticação e de usuário, cadastro, redirecionamentos do OAuth e cookie de ligação. Cliente mTLS para o `users-svc` |
| `/services/club-management-admin-bff` | Só passa a mandar `X-App-Type: ADMIN` |
| `/apps/club-management-client` | Páginas, rotas, sessão, renovação, tema, idiomas, testes e stories |
| `/servers/club-management-server` | Variáveis do `users-svc` e do `client-bff`, dependência do `client-bff` no `users-svc`, URLs dos provedores |
| `/servers/club-management-infra` | Serviço `oauth-mock` |
| `/e2e/club-management-client` | Fluxos Cypress da spec |
| `/e2e/club-management-admin` | Teste de que o administrador não tem cadastro nem login social |

## Decisões técnicas

O detalhe e as alternativas de cada uma estão em [research.md](research.md).

- **OAuth**: Authorization Code com PKCE e `state`, mais `nonce` no Google. Quem fala com o provedor é o `users-svc`. O `client-bff` só redireciona o navegador e guarda o cookie `oauth_binding` (R1).
- **Celular**: redirecionamento na mesma aba, cookie `SameSite=Lax` e retorno com um código de troca de 60 segundos no fragmento da URL, trocado pela sessão em `POST /api/auth/social/session` (R2, R3).
- **Google**: `id_token` validado com `jose` contra o JWKS, exigindo `email_verified` (R4).
- **Facebook**: troca do código, `GET /me` com `appsecret_proof` e escopo `email,public_profile`. Sem email, a entrada é recusada (R5). Como o email do Facebook não é verificado, a primeira entrada de cada identidade manda um link ao email, e a ligação ou a criação da conta só acontece quando a pessoa confirma na página do link, que mostra o nome do perfil e permite recusar. A confirmação substitui outro Facebook já ligado. Email de administrador recebe o mesmo aviso, sem envio. Limites de 1 email por minuto e 5 em 24 horas por endereço, e 10 pedidos por hora por rede (R5a).
- **Uma conta por email**: email normalizado e índice único. Busca pela identidade e depois pelo email. Corridas resolvidas pelo erro de chave duplicada (R6).
- **Pré-cadastro**: ligar um provedor a uma conta não confirmada confirma o email, apaga a senha e sobe `tokenVersion` (R7).
- **Confirmação**: link de 24 horas e uso único. A recuperação de senha também confirma. Reenvio limitado a 1 por minuto. Login com a senha certa e sem confirmação → `403 email_not_verified` (R8).
- **Cadastro**: sempre `202`, com o hash da senha calculado sempre e o email em segundo plano (R9). Até 10 cadastros por hora por rede (R10).
- **Token entre sistemas**: os BFFs mandam `X-App-Type`, e o `users-svc` recusa token de outro tipo (R11).
- **Links**: `APP_URL` vira `ADMIN_APP_URL` e `CLIENT_APP_URL` (R12).
- **Bloqueio**: só no login com senha (US1.4). A entrada social não soma nem zera tentativas (R13).
- **Provedor simulado**: `oauth-mock` em Python no `club-management-infra`, ligado por padrão no Compose (R14).
- **Paleta**: tokens e contrastes em R15. Botões de Google e Facebook com contorno e logotipo, sem scripts dos provedores (R16).
- **Frontend**: o que já existe em `shared/` no admin (`LanguageSwitch`, `ThemeSwitch`, `PublicLayout`, `RouteGuards`, sessão, renovação, preferências, i18n, `auth-token`, `http-client`, `validate-form`) é copiado para o cliente e adaptado. Os repositórios são separados, então não há pacote compartilhado nesta task.
- **Rotas do cliente**: `/login`, `/signup`, `/forgot-password`, `/verify-email`, `/confirm-social-link` e `/auth/callback` são públicas (FR-003). Todas as outras exigem sessão.
- **Tela de cadastro**: depois do envio, a mesma tela mostra "confira seu email", com o botão de reenvio, para qualquer email.
- **Erros do provedor**: `/login?social_error=<código>` mostra a mensagem traduzida e limpa o parâmetro da URL. `/login?social_notice=check_email` mostra, do mesmo jeito, o aviso para conferir o email depois da primeira entrada pelo Facebook.

## Estrutura

### Documentação

```text
specs/003-client-login/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── client-bff-api.md
│   ├── users-svc-api.md
│   └── oauth-mock.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Código

```text
services/club-management-users-svc/src/
├── application/
│   ├── controllers/      registration-controller.ts, social-login-controller.ts
│   ├── dto/              registration-dto.ts, social-login-dto.ts
│   ├── middlewares/      require-app-type-middleware.ts, require-auth-middleware.ts (confere o tipo)
│   └── routes/           registration-route.ts, social-login-route.ts
├── domain/
│   ├── models/           social-identity-model.ts, user-model.ts, auth-errors-model.ts
│   ├── ports/            registration-*-ports.ts, social-login-*-ports.ts
│   └── usecases/         register-client-usecase.ts, verify-email-usecase.ts,
│                         resend-verification-usecase.ts, start-social-login-usecase.ts,
│                         complete-social-login-usecase.ts, exchange-social-code-usecase.ts,
│                         preview-social-link-usecase.ts, confirm-social-link-usecase.ts,
│                         decline-social-link-usecase.ts
├── infra/
│   ├── adapters/         um por ação, por exemplo: create-client-user-adapter.ts,
│   │                     link-social-identity-adapter.ts, exchange-google-code-adapter.ts,
│   │                     verify-google-id-token-adapter.ts, exchange-facebook-code-adapter.ts,
│   │                     get-facebook-profile-adapter.ts, send-verification-email-adapter.ts,
│   │                     send-signup-attempt-email-adapter.ts, consume-oauth-state-adapter.ts,
│   │                     create-social-link-request-adapter.ts, send-social-link-email-adapter.ts …
│   └── schemas/          email-verification-tokens-schema.ts, oauth-states-schema.ts,
│                         social-login-codes-schema.ts, social-link-requests-schema.ts,
│                         registration-attempts-schema.ts
└── config/               load-env-config.ts (variáveis novas)

services/club-management-client-bff/src/
├── application/          controllers/auth_controller.py, social_login_controller.py,
│                         dto/auth_dto.py, routes/auth_route.py, social_login_route.py
├── domain/               ports/auth_ports.py, usecases/auth_usecases.py, social_login_usecases.py
├── infra/adapters/       users_svc_adapters.py
└── config/               create_http_client_config.py

apps/club-management-client/src/
├── pages/
│   ├── Login/            LoginForm, SocialLoginButtons, aviso de email não confirmado
│   ├── SignUp/           SignUpForm, tela "confira seu email"
│   ├── VerifyEmail/
│   ├── ConfirmSocialLink/
│   ├── SocialCallback/
│   ├── ForgotPassword/
│   └── Home/
└── shared/               components, hooks, i18n, services, theme, utils (ver Decisões)

servers/club-management-infra/oauth-mock/
├── requirements.txt, main.py, templates/authorize.html
└── tests/
```

**Structure Decision**: a mesma divisão de 001, com arquitetura hexagonal nos serviços e escopo por página no frontend. `SocialLoginButtons` fica em `pages/Login` porque só a página de login o usa.

## Constitution Check

*Antes da pesquisa e de novo depois do design.*

| Princípio | Status | Observação |
|-----------|--------|------------|
| I. Fronteiras dos repositórios | Pass | Usuários, cadastro e provedores no `users-svc`. Provedor simulado em `club-management-infra` |
| I. Variáveis de ambiente | Pass | Credenciais reais só em `.env` e `.secrets.env`, ignorados. `.env.example` com os valores do simulado |
| II. Fluxo Frontend → BFF → Serviço | Pass | O frontend só chama `/api`. O navegador vai ao provedor por redirecionamento, que não é uma chamada do frontend a um serviço |
| II. Backend hexagonal | Pass | Provedores, banco, email e hash por Output Ports, com um adapter por ação |
| II. BFF orquestrador | Pass | O `client-bff` repassa, guarda o cookie e redireciona. Quem valida e decide é o `users-svc` |
| II. Frontend sem regra de negócio | Pass | O frontend valida o formato com Zod. Unicidade, confirmação, ligação e limites ficam no `users-svc` |
| II. Serviços não se comunicam | Pass | Só o `users-svc` é usado |
| II. mTLS | Pass | `client-bff` → `users-svc` passa a existir, com o certificado `client-bff` que já é gerado. As chamadas aos provedores são externas e usam HTTPS |
| II. Tipagem estrita | Pass | Respostas dos provedores e do simulado validadas com Zod, sem `as` nem `any` |
| II. Escopo de página e `shared/` | Pass | Código usado por mais de uma página em `shared/` |
| II. SWR e formulários Zod | Pass | Mutações com `useSWRMutation`. Cadastro, login, reenvio e recuperação validados antes do envio |
| II. MUI, mobile-first e Storybook | Pass | Layout a partir de `xs`. Stories para tudo em `shared/components`, nos dois temas |
| III. Testes e cobertura | Pass | 90% nos projetos alterados. Cypress em viewport mobile, mais uma passagem em 1280 px |
| III. Pipelines | Pass | O `oauth-mock` entra na pipeline Infra. O E2E do cliente já está na pipeline integrada |
| IV. Hot-reload | Pass | O `oauth-mock` sobe com `--reload` e volume mapeado. Nenhum serviço novo exige rebuild |
| V. Ciclo Speckit | Pass | Próximo passo: `/speckit-implement` |

Nenhuma violação, então a tabela de complexidade fica vazia.

## Riscos

| Risco | Mitigação |
|-------|-----------|
| O Facebook muda a versão da Graph API | Versão em `FACEBOOK_GRAPH_VERSION` |
| O Facebook devolve um email que não é da pessoa | Nada é ligado nem criado sem a confirmação pelo email, com o nome do perfil na página do link e a opção de recusar (R5a) |
| A dona do email confirma um pedido que não fez | A página do link mostra o nome do perfil do Facebook e o email, e exige clicar em Confirmar. O email diz para ignorar se não foi ela |
| Entradas pelo Facebook em massa para encher a caixa de alguém | 5 emails por endereço em 24 horas e 10 pedidos por hora por rede, com a mesma resposta acima do limite (R5a) |
| Navegadores embutidos (Instagram, Facebook) recusam o Google | Mensagem `provider_unavailable` sugere abrir no navegador ou usar email e senha (R2) |
| O simulado aceita algo que o provedor real recusa | Roteiro manual com os provedores reais em [quickstart.md](quickstart.md) |
| Troca de `APP_URL` quebra quem já tem `.env` | O `users-svc` recusa subir sem as variáveis novas e diz quais faltam, como hoje |

## Complexity Tracking

Sem violações.
