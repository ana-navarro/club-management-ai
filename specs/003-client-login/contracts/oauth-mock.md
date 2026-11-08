# Contract: provedor simulado (`oauth-mock`)

Container em `/servers/club-management-infra/oauth-mock`, só para desenvolvimento e CI. Porta `8090`, exposta em `${OAUTH_MOCK_PORT:-8090}`, e nome `oauth-mock` na rede do Compose.

Ele aceita só o client ID e o segredo de `.env.example` (`mock-google-client` / `mock-google-secret`, `mock-facebook-app` / `mock-facebook-secret`) e confere `redirect_uri` e o PKCE, como os provedores reais.

## Google

| Rota | Comportamento |
|------|---------------|
| `GET /google/authorize` | Mostra o formulário (ver abaixo). Confirmar → `302 {redirect_uri}?code=…&state=…`. Cancelar → `302 {redirect_uri}?error=access_denied&state=…` |
| `POST /google/token` | Troca o código uma única vez, conferindo `client_secret`, `redirect_uri` e `code_verifier`. Devolve `{ access_token, id_token, token_type, expires_in }` |
| `GET /google/jwks` | Chave pública RSA, gerada ao subir |

O `id_token` tem `iss=http://oauth-mock:8090/google`, `aud`, `sub`, `email`, `email_verified`, `name`, `nonce`, `iat` e `exp`.

## Facebook

| Rota | Comportamento |
|------|---------------|
| `GET /facebook/dialog/oauth` | O mesmo formulário |
| `GET /facebook/{versão}/oauth/access_token` | Troca o código, como no Google. Devolve `{ access_token, token_type, expires_in }` |
| `GET /facebook/{versão}/me` | Confere `appsecret_proof`. Devolve `{ id, name }` e `email` se o formulário não marcou "sem email" |

As rotas da Graph API levam a versão no caminho, como em `https://graph.facebook.com/v23.0/me`, então `FACEBOOK_GRAPH_URL` aponta para `http://oauth-mock:8090/facebook`.

## Formulário

Campos: email, nome, identificador (opcional), "email verificado" (marcado por padrão) e "não informar o email". Botões Confirmar e Cancelar.

O `sub` (ou `id`) é derivado do email e do provedor, então o mesmo email gera a mesma identidade em todas as tentativas. O campo identificador troca esse valor, para testar dois perfis com o mesmo email.

O Cypress preenche o formulário com `cy.origin('http://localhost:8090', …)`, como uma pessoa faria no provedor real.

## Controle dos testes

`POST /control/fail-next` faz a próxima troca de código responder `500`, para testar `provider_unavailable`.
