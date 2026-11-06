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
