# club-management-infra

Infraestrutura de outros servidores, como email e WhatsApp.

## Email

- **Desenvolvimento e CI**: Mailpit, que recebe os emails sem entregá-los. A caixa de entrada fica em
  <http://localhost:8025>.
- **Ambientes publicados**: Brevo, por `smtp-relay.brevo.com:587`.

O serviço que envia emails é configurado por estas variáveis:

| Variável | Mailpit | Brevo |
|----------|---------|-------|
| `SMTP_HOST` | `mailpit` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `1025` | `587` |
| `SMTP_REQUIRE_TLS` | `false` | `true` |
| `SMTP_USER` | vazio | Login SMTP do Brevo |
| `SMTP_PASSWORD` | vazio | Chave SMTP do Brevo |
| `SMTP_FROM` | qualquer email | Remetente verificado no Brevo |

O Brevo só aceita IPs liberados em **Authorized IPs**, incluindo o do servidor publicado.

## Google e Facebook simulados

O `oauth-mock` substitui o Google e o Facebook no desenvolvimento e na CI, sem credenciais nem
internet. Ele fica em <http://localhost:8090> e responde nas mesmas rotas dos provedores:

| Provedor | Rotas |
|----------|-------|
| Google | `/google/authorize`, `/google/token`, `/google/jwks` |
| Facebook | `/facebook/dialog/oauth`, `/facebook/{versão}/oauth/access_token`, `/facebook/{versão}/me` |

Ele só aceita as credenciais de `.env.example` (`mock-google-client` / `mock-google-secret` e
`mock-facebook-app` / `mock-facebook-secret`), confere `redirect_uri` e o PKCE e mostra um formulário
para escolher o email, o nome, se o email é verificado e se o email é enviado. `POST /control/fail-next`
faz a próxima troca de código falhar, para testar `provider_unavailable`.

O código fica em `oauth-mock/`, roda com `--reload` e tem testes:

```text
cd oauth-mock
pip install -r requirements.txt -r requirements-dev.txt
pytest && ruff check . && mypy .
```
