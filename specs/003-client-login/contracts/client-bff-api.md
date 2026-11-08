# Contract: API pública do `client-bff`

O frontend do cliente chama estas rotas em `/api`. O NGINX remove o prefixo `/api` e repassa ao `client-bff` por mTLS, com `X-Real-IP`.

Os erros sempre têm o formato `{ "error": "<código>" }`. Um corpo inválido responde `400 invalid_request`, sem repetir o que foi enviado. Os códigos repassados do `users-svc` estão em [users-svc-api.md](users-svc-api.md).

## Iguais ao `admin-bff`

As rotas abaixo têm o mesmo corpo e a mesma resposta de [001-admin-login](../../001-admin-login/plan.md), mas mandam `userType: CLIENT` e `X-App-Type: CLIENT` ao `users-svc`.

| Método | Rota | Resposta |
|--------|------|----------|
| POST | `/api/auth/login` | `200` sessão (ver abaixo), `401 invalid_credentials`, `403 email_not_verified` |
| POST | `/api/auth/refresh` | `200` `{ token, expiresAt, renewAt }`, `401 invalid_token` |
| POST | `/api/auth/forgot-password` | `202` |
| POST | `/api/auth/reset-password` | `204`, `400 invalid_reset_link`, `400 weak_password` |
| GET | `/api/users/me` | `200` usuário |
| PATCH | `/api/users/me/preferences` | `200` usuário |

O login, como no administrador, grava as preferências da sessão que o usuário ainda não tem salvas.

**Sessão**:

```json
{
  "token": "<jwt>",
  "expiresAt": "2026-11-07T14:00:00.000Z",
  "renewAt": "2026-11-07T13:45:00.000Z",
  "user": {
    "id": "…", "name": "…", "email": "…", "type": "CLIENT", "clubs": [],
    "preferences": { "theme": "dark", "language": "pt-BR" }
  }
}
```

## Cadastro e confirmação

### `POST /api/auth/register`

```json
{ "name": "Ana", "email": "ana@example.com", "password": "********", "language": "pt-BR" }
```

| Resposta | Quando |
|----------|--------|
| `202`, sem corpo | Sempre que o corpo é válido, exista ou não a conta (FR-009) |
| `400 invalid_request` / `400 weak_password` | Corpo inválido ou senha curta |
| `429 too_many_requests` | Limite de cadastros da rede (R10) |

`language` é opcional e vem da sessão. Não há campo de tipo de conta.

### `POST /api/auth/verify-email`

```json
{ "token": "<token do link>" }
```

`204` quando confirma. `400 invalid_verification_link` quando o link não existe, expirou ou já foi usado.

### `POST /api/auth/resend-verification`

```json
{ "email": "ana@example.com", "language": "pt-BR" }
```

Sempre `202` com corpo válido (R8).

## Login social

`{provider}` é `google` ou `facebook`. Qualquer outro valor responde `404`.

### `GET /api/auth/{provider}/start`

Navegação de primeiro nível, aberta pelo botão da página de login.

- Query opcional: `language=pt-BR|en`.
- Gera um valor aleatório de ligação e o grava no cookie `oauth_binding`, com `HttpOnly`, `SameSite=Lax`, `Path=/api/auth/` e `Max-Age=600`. O cookie usa `Secure` quando `CLIENT_APP_URL` é `https`.
- Pede ao `users-svc` a URL do provedor e responde `302` para ela.
- Se o provedor não estiver configurado ou o `users-svc` falhar, responde `302` para `/login?social_error=provider_unavailable`.

### `GET /api/auth/{provider}/callback`

O provedor redireciona para cá. Esta é a URL cadastrada nos painéis: `{CLIENT_APP_URL}/api/auth/{provider}/callback`.

- Lê `code`, `state`, `error` e o cookie `oauth_binding`, e apaga o cookie na resposta.
- Repassa ao `users-svc`, que valida e decide.
- Sucesso: `302` para `/auth/callback#code=<código de troca>`.
- Primeira entrada pelo Facebook (`202` do `users-svc`): `302` para `/login?social_notice=check_email`.
- Falha: `302` para `/login?social_error=<código>`, sem nenhum outro dado.

| `social_error` | Quando |
|----------------|--------|
| `cancelled` | A pessoa cancelou no provedor (`error=access_denied`) |
| `email_required` | O provedor não informou o email ou não o informou como verificado |
| `invalid_credentials` | O email do Google é de uma conta de administrador. No Facebook não ligado, esse caso recebe `social_notice=check_email` |
| `provider_unavailable` | O provedor falhou ou não está configurado |
| `invalid_state` | Cookie ausente, `state` desconhecido, expirado, repetido ou de outro navegador |

### Confirmação do Facebook

Usadas pela página `/confirm-social-link` (FR-014c). Todas com `{ "token": "<token do link>" }`.

| Rota | Resposta |
|------|----------|
| `POST /api/auth/social/link/preview` | `200 { "provider": "facebook", "profileName": "…", "email": "…" }`, `400 invalid_social_link` |
| `POST /api/auth/social/link/confirm` | `204`, `400 invalid_social_link` |
| `POST /api/auth/social/link/decline` | `204` |

### `POST /api/auth/social/session`

```json
{ "code": "<código de troca>", "language": "pt-BR", "theme": "dark" }
```

`200` com a mesma sessão do login com senha, gravando as preferências da sessão que faltam. `401 invalid_social_code` quando o código não existe, expirou ou já foi usado.
