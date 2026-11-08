# Contract: API interna do `users-svc`

Só os BFFs alcançam estas rotas, por mTLS. Todo pedido traz `X-App-Type: ADMIN` ou `X-App-Type: CLIENT`. Sem esse cabeçalho, ou com outro valor, a resposta é `400 invalid_request`. A exceção é `GET /health`, usado pela verificação de saúde do Compose.

## Mudanças em rotas existentes

| Rota | Mudança |
|------|---------|
| Rotas com `Authorization` (`/auth/refresh`, `/users/me`, `/users/me/preferences`) | `401 invalid_token` quando o `type` do token é diferente de `X-App-Type` (R11) |
| `POST /auth/login` | Com a senha certa, um cliente sem email confirmado recebe `403 email_not_verified`. Uma conta sem senha recebe `401 invalid_credentials` |
| `POST /auth/forgot-password` | O link usa `ADMIN_APP_URL` ou `CLIENT_APP_URL`, conforme o tipo da conta |
| `POST /auth/reset-password` | Também grava `emailVerifiedAt` e invalida os links de confirmação |

## Rotas novas

### `POST /auth/register`

Só com `X-App-Type: CLIENT`. Caso contrário, `404`.

```json
{ "name": "Ana", "email": "ana@example.com", "password": "********", "language": "pt-BR", "ip": "203.0.113.7" }
```

Corpo `strict`, com `language` e `ip` opcionais. Sempre `202` com corpo válido. `400 weak_password`, `429 too_many_requests`. O comportamento está em [research.md](../research.md) R9 e R10.

### `POST /auth/verify-email`

`{ "token": "…" }` → `204` ou `400 invalid_verification_link`.

### `POST /auth/resend-verification`

`{ "email": "…", "language": "pt-BR" }` → `202`.

### `POST /auth/social/{provider}/authorization`

Só com `X-App-Type: CLIENT`.

```json
{ "binding": "<valor do cookie>", "language": "pt-BR" }
```

→ `200 { "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }`. Cria um `oauthState` (ver [data-model.md](../data-model.md)). `503 provider_unavailable` quando faltam as credenciais do provedor.

A URL leva `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`, `code_challenge`, `code_challenge_method=S256` e, no Google, `nonce` e `prompt=select_account`.

### `POST /auth/social/{provider}/callback`

```json
{ "binding": "…", "state": "…", "code": "…", "error": null, "ip": "…", "userAgent": "…" }
```

→ `200 { "code": "<código de troca>" }`, ou `202 { "pending": "email_confirmation" }` na primeira entrada de uma identidade do Facebook (FR-014c).

Passos, nesta ordem:

1. Marca o `oauthState` como usado, de forma atômica, conferindo `stateHash`, `bindingHash`, `provider` e a validade. Se falhar: `400 invalid_state`.
2. `error` do provedor: `access_denied` → `400 cancelled`. Outro → `502 provider_unavailable`.
3. Troca o código e valida a identidade (R4, R5). Falha de rede ou resposta inválida → `502 provider_unavailable`. Sem email, ou no Google sem `email_verified` → `400 email_required`.
4. Busca pela identidade. Achou → segue no passo 6 com essa conta.
5. No Facebook, sempre responde `202` e para aqui (R5a): email de administrador → nada é gravado nem enviado; pedido para o mesmo email há menos de 1 minuto → nada novo, o link enviado continua valendo; acima de 10 pedidos por hora na rede ou de 5 emails em 24 horas para o email → nada é enviado; nos outros casos, grava o `socialLinkRequest`, invalidando o anterior da mesma identidade, e manda o email. No Google: email de administrador → `401 invalid_credentials`; senão, decide a conta (R6, R7).
6. Faz a verificação de local novo, como no login com senha, sem mexer nas tentativas.
7. Cria o `socialLoginCode` e devolve o código.

### `POST /auth/social/link/preview`

Só com `X-App-Type: CLIENT`. `{ "token": "…" }` → `200 { "provider": "facebook", "profileName": "…", "email": "…" }`. Só lê, não confirma. `400 invalid_social_link` quando o pedido não existe, expirou ou já foi usado.

### `POST /auth/social/link/confirm`

Só com `X-App-Type: CLIENT`. `{ "token": "…" }` → `204`. Marca o pedido como usado de forma atômica e aplica R6 e R7 com o email do pedido (R5a). Se a conta já tem outra identidade do Facebook, ela é substituída. `400 invalid_social_link` quando o pedido não vale, quando o email agora é de um administrador ou quando a identidade já foi ligada a outra conta.

### `POST /auth/social/link/decline`

Só com `X-App-Type: CLIENT`. `{ "token": "…" }` → `204`, mesmo para um token inválido. Marca o pedido como usado, sem ligar nada.

### `POST /auth/social/session`

`{ "code": "…" }` → `200` com a mesma resposta de `/auth/login`. `401 invalid_social_code`.

Cada sessão aberta assim tem um `sid` novo e `sessionStartedAt` igual ao momento da troca, com as regras de renovação e de 12 horas de 001.

## Emails novos

Todos em português e inglês, conforme o idioma salvo da conta ou o da sessão, como em 001.

| Email | Quando | Link |
|-------|--------|------|
| Confirme seu email | Cadastro e reenvio | `{CLIENT_APP_URL}/verify-email?token=…` |
| Tentativa de cadastro | Cadastro com um email que já tem conta confirmada | Login e recuperação de senha do sistema da conta |
| Confirme a entrada com o Facebook | Primeira entrada de uma identidade do Facebook, no máximo 1 por minuto e 5 em 24 horas por email, e 10 pedidos por hora por rede. Nunca para email de administrador. Traz o nome do perfil e diz para ignorar se não foi a pessoa | `{CLIENT_APP_URL}/confirm-social-link?token=…` |

## Variáveis novas

| Variável | Obrigatória | Padrão no Compose |
|----------|-------------|-------------------|
| `ADMIN_APP_URL` | Sim (substitui `APP_URL`) | `http://localhost:8081` |
| `CLIENT_APP_URL` | Sim | `http://localhost:8080` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Não. Sem elas, o Google responde `provider_unavailable` | Credenciais do simulado |
| `GOOGLE_AUTHORIZE_URL`, `GOOGLE_TOKEN_URL`, `GOOGLE_JWKS_URL`, `GOOGLE_ISSUERS` (lista separada por vírgula) | Não. Padrão: URLs reais do Google | Simulado |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Não. Sem elas, o Facebook responde `provider_unavailable` | Credenciais do simulado |
| `FACEBOOK_SCOPE` | Não. Padrão: `email,public_profile` | |
| `FACEBOOK_GRAPH_VERSION` | Não. Padrão: a versão escolhida na implementação | |
| `FACEBOOK_AUTHORIZE_URL`, `FACEBOOK_GRAPH_URL` | Não. Padrão: URLs reais do Facebook | Simulado |

A URL de autorização é aberta pelo navegador, então no simulado ela usa `localhost`. As outras são chamadas pelo `users-svc` e usam o nome do container.
