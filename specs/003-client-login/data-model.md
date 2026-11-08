# Data Model: Login e cadastro do cliente

**Feature**: `003-client-login` | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

Todas as coleções ficam no `users-svc`, no mesmo banco de `001-admin-login`. Os tokens e códigos que vão para email ou URL são guardados só como hash SHA-256.

## `users` (alterada)

| Campo | Tipo | Mudança | Regra |
|-------|------|---------|-------|
| `email` | string | Igual | Normalizado com `trim` e minúsculas. Índice único (FR-010a) |
| `passwordHash` | string ou `null` | Passa a aceitar `null` | `null` em conta criada pelo provedor e depois de FR-014a. O login com senha falha, conferindo contra o hash fixo |
| `emailVerifiedAt` | Date ou `null` | Novo | `null` até a confirmação. Gravado pela confirmação, pela recuperação de senha, pela entrada pelo Google e pela confirmação do Facebook |
| `verificationEmailSentAt` | Date ou `null` | Novo | Último envio do link de confirmação. Limita o reenvio a 1 por minuto |
| `socialIdentities` | `{ provider, subject, linkedAt }[]` | Novo | `provider` é `google` ou `facebook`. No máximo uma por provedor |

Os demais campos de 001 não mudam.

**Índices novos**: `{ 'socialIdentities.provider': 1, 'socialIdentities.subject': 1 }` único, com `partialFilterExpression: { 'socialIdentities.subject': { $exists: true } }`. Não usar `sparse`: o MongoDB indexa um array vazio como `undefined`, e `sparse` não ignora um campo que existe, então dois usuários sem identidade dariam chave duplicada.

**Migração**: ao subir, o script de índices grava `emailVerifiedAt = createdAt` nas contas de administrador sem o campo. O seed cria o administrador já confirmado.

### Estados de uma conta de cliente

```text
                 cadastro
                    │
                    ▼
          ┌──────────────────┐  link de confirmação, recuperação de senha
          │  não confirmada  │─────────────────────────────────────┐
          │  (com senha)     │                                     │
          └──────────────────┘                                     ▼
                    │ Google, ou link do Facebook      ┌──────────────────┐
                    │ (FR-014a: apaga a senha,         │    confirmada    │
                    │  sobe tokenVersion)              │  com/sem senha   │
                    └─────────────────────────────────▶└──────────────────┘
                                                               ▲
          primeira entrada pelo Google, ou link do Facebook,   │
          sem conta ───────────────────────────────────────────┘
```

| Estado | Login com senha | Google | Facebook não ligado | Facebook ligado |
|--------|-----------------|--------|---------------------|-----------------|
| Sem conta | `invalid_credentials` | Cria confirmada e entra | Manda o link. A confirmação cria a conta confirmada | Não se aplica |
| Não confirmada | `403 email_not_verified` com a senha certa | Confirma, apaga a senha e entra | Manda o link. A confirmação confirma, apaga a senha e liga | Não se aplica |
| Confirmada com senha | Entra | Liga a identidade e entra | Manda o link. A confirmação liga | Entra |
| Confirmada sem senha | `invalid_credentials` | Entra. A recuperação de senha define uma senha | Manda o link. A confirmação liga | Entra |

"Facebook ligado" é a identidade já em `socialIdentities`, encontrada antes da busca pelo email. Na confirmação, se a conta tem outro Facebook ligado, o novo o substitui.

Email de administrador: o Google responde `invalid_credentials`. O Facebook não ligado responde o mesmo aviso de conferir o email, sem gravar pedido e sem enviar nada.

O login com senha de administrador não muda.

## `emailVerificationTokens` (nova)

| Campo | Tipo | Regra |
|-------|------|-------|
| `_id` | ObjectId | |
| `userId` | ObjectId | |
| `tokenHash` | string | Índice único |
| `expiresAt` | Date | 24 horas depois da criação. Índice TTL |
| `usedAt` | Date ou `null` | Uso único, gravado de forma atômica |
| `createdAt` | Date | |

Um novo envio marca os anteriores do mesmo usuário como usados.

## `oauthStates` (nova)

Uma tentativa de entrada social, do clique no botão até o retorno do provedor.

| Campo | Tipo | Regra |
|-------|------|-------|
| `_id` | ObjectId | |
| `stateHash` | string | Hash do `state` enviado ao provedor. Índice único |
| `bindingHash` | string | Hash do valor do cookie de ligação do navegador |
| `provider` | `google` ou `facebook` | Precisa ser igual ao do retorno |
| `codeVerifier` | string | PKCE. Nunca sai do `users-svc` |
| `nonce` | string ou `null` | Só no Google |
| `language` | `pt-BR` ou `en` ou `null` | Idioma da sessão, para a conta nova e os emails |
| `expiresAt` | Date | 10 minutos. Índice TTL |
| `usedAt` | Date ou `null` | Uso único, gravado de forma atômica antes de falar com o provedor |

## `socialLinkRequests` (nova)

A primeira entrada de uma identidade do Facebook, esperando a confirmação pelo email (FR-014c, research R5a).

| Campo | Tipo | Regra |
|-------|------|-------|
| `_id` | ObjectId | |
| `tokenHash` | string | Hash do token do link. Índice único |
| `provider` | `facebook` | Só o Facebook usa, por enquanto |
| `subject` | string | Identificador da pessoa no provedor |
| `email` | string | Normalizado. Índice com `createdAt`, para os limites de 1 envio por minuto e 5 em 24 horas |
| `profileName` | string | Nome do perfil, mostrado na página do link. Até 100 caracteres |
| `language` | `pt-BR` ou `en` ou `null` | Idioma do email e da conta nova |
| `expiresAt` | Date | 24 horas. Índice TTL |
| `usedAt` | Date ou `null` | Gravado de forma atômica na confirmação, na recusa e quando um novo pedido da mesma identidade o substitui |
| `createdAt` | Date | |

Não guarda nenhum token do Facebook.

## `socialLoginCodes` (nova)

O código de troca entregue ao frontend no fragmento da URL.

| Campo | Tipo | Regra |
|-------|------|-------|
| `_id` | ObjectId | |
| `codeHash` | string | Índice único |
| `userId` | ObjectId | |
| `expiresAt` | Date | 60 segundos. Índice TTL |
| `usedAt` | Date ou `null` | Uso único |

## `registrationAttempts` (nova)

| Campo | Tipo | Regra |
|-------|------|-------|
| `_id` | ObjectId | |
| `networkHash` | string | Mesmo hash de prefixo de rede de 001. Índice único |
| `count` | number | Incrementado de forma atômica |
| `expiresAt` | Date | 1 hora depois do primeiro cadastro da janela. Índice TTL |

## `socialLinkAttempts` (nova)

Mesma estrutura e mesmo adapter de contagem de `registrationAttempts`, para o limite de 10 pedidos de ligação do Facebook por hora por rede (research R5a).

| Campo | Tipo | Regra |
|-------|------|-------|
| `_id` | ObjectId | |
| `networkHash` | string | Mesmo hash de prefixo de rede de 001. Índice único |
| `count` | number | Incrementado de forma atômica |
| `expiresAt` | Date | 1 hora depois do primeiro pedido da janela. Índice TTL |

## `passwordResetTokens` (sem mudança na estrutura)

A troca de senha passa a gravar `emailVerifiedAt` quando ele for `null`, e a invalidar os links de confirmação pendentes.

## Validação

| Dado | Regra | Onde |
|------|-------|------|
| Nome | 1 a 100 caracteres, sem espaços nas pontas | Zod no frontend e no `users-svc`, Pydantic no BFF |
| Email | Formato de email, até 254 caracteres | Igual |
| Senha | 8 a 256 caracteres (`MINIMUM_PASSWORD_LENGTH`) | Igual |
| Confirmação da senha | Igual à senha | Só no frontend |
| Tipo da conta | Sempre `CLIENT`. O corpo do cadastro não tem esse campo e é `strict` | `users-svc` |
