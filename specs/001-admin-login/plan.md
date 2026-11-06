# Plan: Login do administrador

**Feature**: `001-admin-login` | **Spec**: [spec.md](spec.md)

## Summary

Implementar a autenticação de ponta a ponta. O `club-management-users-svc` guarda usuários e clubes, emite e renova
tokens e envia os emails de recuperação por SMTP. O `club-management-admin-bff` orquestra as chamadas e limpa os dados entregues
ao frontend. O `club-management-admin` só cuida da apresentação: rotas protegidas, páginas públicas, renovação automática,
temas e idiomas. O ambiente local e o de CI ganham MongoDB e um servidor SMTP de testes.

## Affected projects

- `/apps/club-management-admin`: páginas, rotas, sessão, tema, idiomas, testes e stories.
- `/services/club-management-admin-bff`: rotas de autenticação e de usuário, orquestração e limpeza de dados.
- `/services/club-management-users-svc`: usuários, clubes, tokens, senhas e envio de email.
- `/servers/club-management-server`: MongoDB local e variáveis do Compose.
- `/servers/club-management-infra`: servidor SMTP de testes.
- `/e2e/club-management-admin`: fluxos Cypress com o ambiente completo.

## Decisões técnicas

- **Banco**: Azure DocumentDB, compatível com a API do MongoDB, com Mongoose. O banco se chama `ranking-svc`, nome anterior do projeto. Nesta task, só o `users-svc` recebe as credenciais,
  por `DATABASE_URL`. Outro serviço que precisar delas recebe acesso na task correspondente.
- **Ambientes**: desenvolvimento e CI usam um container MongoDB. O Azure DocumentDB fica para os ambientes publicados, para
  testes não alterarem dados reais. As diferenças entre os dois exigem uma verificação manual contra o Azure.
- **Testes de adapters**: `mongodb-memory-server`, com um MongoDB real em memória.
- **Senhas**: Argon2, com `@node-rs/argon2`, que usa binários prontos.
- **Token**: JWT assinado pelo `users-svc`, com `JWT_SECRET` obrigatório e duração de 2 horas. Só o `users-svc` conhece
  o segredo. O BFF repassa o cabeçalho `Authorization`.
- **Conteúdo do token**: `sub`, `name`, `email`, `type`, `clubIds`, `tokenVersion`, `sid`, `sessionStartedAt`, `iat`, `exp` e `jti`.
- **Sessão**: cada login gera um `sid` novo e não grava estado no banco. A renovação mantém `sid` e `sessionStartedAt`, e usa como
  expiração o menor valor entre agora mais 2 horas e o início da sessão mais 12 horas.
- **Token único**: `jti` é um UUID aleatório gerado a cada emissão, então dois tokens nunca são iguais, mesmo no mesmo
  segundo.
- **Revogação**: cada usuário tem `tokenVersion`, que vai no token e sobe ao redefinir a senha.
- **Renovação**: o `users-svc` devolve `renewAt`. Um hook observa a atividade e, depois desse horário, chama
  `/api/auth/refresh`, com uma chamada por vez. Um timer encerra a sessão ao chegar `expiresAt`.
- **Tipo do login**: o `admin-bff` envia `userType: ADMIN` ao serviço, que decide.
- **Preferências no login**: o `admin-bff` orquestra. Ele chama o login e, se o usuário não tiver escolha salva, grava as
  da sessão e devolve o resultado. O frontend só aplica o que recebe.
- **Limpeza de dados**: o `admin-bff` entrega apenas os campos do contrato, usando os schemas Pydantic de resposta.
- **Regras no frontend**: os formulários são validados com Zod antes do envio: campos obrigatórios, formato de email, tamanho e
  confirmação de senha. O backend valida de novo e continua decidindo.
- **Tentativas de login**: `users` guarda `failedLoginAttempts` e `lockedUntil`, atualizados de forma atômica. Com conta inexistente,
  a senha é conferida contra um hash fixo, para o tempo de resposta não revelar a conta.
- **Local novo**: o `users-svc` guarda em `users.knownNetworks` o hash do prefixo da rede, com no máximo 20 itens, e nunca o IP
  completo. O NGINX define `X-Real-IP`, e o `admin-bff` o repassa ao serviço com o navegador. Esse cabeçalho vem apenas do NGINX,
  e o cliente não consegue definir o valor.
- **Recuperação de senha**: token aleatório, guardado apenas como hash, com validade de 2 horas e uso único. Um novo pedido
  invalida o anterior. `users.passwordResetRequests` conta os pedidos, com limite de 5, e `users.passwordResetWindowStartedAt` marca o início da
  contagem, que zera ao trocar a senha ou depois de 24 horas. A resposta
  é igual exista ou não a conta, e o envio não é aguardado, para o tempo de resposta não revelar a conta.
- **Email**: `nodemailer` no adapter do `users-svc`, configurado por `SMTP_*`. O provedor é o Brevo, por
  `smtp-relay.brevo.com:587`. Desenvolvimento e CI usam o Mailpit, em `/servers/club-management-infra`, para não enviar emails reais.
- **Rota de nova senha**: fica em `/forgot-password?token=...`, para manter só duas rotas públicas. Esse token de uso único
  é o único que aparece em URL.
- **Índices e seed**: rodam ao subir o `users-svc` no Compose. O seed cria o administrador inicial com
  `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`, e não faz nada se essas variáveis não existirem.
- **Variáveis**: todo projeto tem `.env` e `.env.example`. O `.env` de cada projeto é opcional no Compose, para o CI subir
  sem ele. O frontend não guarda segredos em `.env`, porque tudo que começa com `VITE_` vai para o navegador.
- **Comunicação interna**: mTLS com uma autoridade certificadora privada. Criptografar também o corpo das mensagens foi descartado,
  porque repetiria a proteção do TLS e aumentaria o risco de erro no manuseio de chaves.
- **Certificados locais**: um container de uso único gera a autoridade e os certificados em um volume do Docker, se ainda não
  existirem. Assim, nada fica nas pastas do projeto, e o CI funciona sem segredos. Produção recebe os seus por `TLS_*`.
- **`X-Real-IP`**: como o BFF só aceita o gateway e o `users-svc` só aceita o BFF, ninguém consegue forjar esse cabeçalho pela
  rede interna.
- **Rotas**: `react-router`. **Idiomas**: `i18next` e `react-i18next`.

## Modelo de dados

| Coleção | Campos | Índices |
|---------|--------|---------|
| `users` | `_id`, `name`, `email`, `passwordHash`, `type`, `clubIds`, `theme`, `language`, `tokenVersion`, `failedLoginAttempts`, `lockedUntil`, `passwordResetRequests`, `passwordResetWindowStartedAt`, `knownNetworks`, `createdAt`, `updatedAt` | `email` único, `clubIds` |
| `clubs` | `_id`, `name`, `createdAt` | Nenhum |
| `passwordResetTokens` | `_id`, `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt` | `tokenHash` único, `expiresAt` com TTL |

## Tema

A paleta foi distribuída assim, para manter o contraste mínimo de 4,5:1 em texto:

| Token | Claro | Escuro |
|-------|-------|--------|
| `background.default` | `#EEEEEE` | `#071B2B` |
| `background.paper` | `#FFFFFF` | `#071B2B` com sobreposição clara do MUI |
| `text.primary` | `#071B2B` | `#EEEEEE` |
| `primary.main` | `#167D8D` | `#B9E4E8` |
| `primary.contrastText` | `#FFFFFF` | `#071B2B` |
| Links | `#071B2B` | `#B9E4E8` |

`#167D8D` não é usado como cor de texto: tem contraste de cerca de 4,2:1 sobre `#EEEEEE` e 3,7:1 sobre `#071B2B`.

## Constitution Check

| Princípio | Status | Observação |
|-----------|--------|------------|
| I. Fronteiras dos repositórios | Pass | Todo o backend de usuários no `users-svc`, servidor de email em `/servers/club-management-infra` |
| II. Fluxo Frontend → BFF → Serviço | Pass | O frontend só chama `/api`, e só o BFF chama o serviço |
| II. Backend hexagonal | Pass | Usecases acessam banco, email e hash apenas por Output Ports, com um adapter por ação |
| II. BFF orquestrador | Pass | O BFF coordena as chamadas e limpa os dados, sem regra de domínio |
| II. Frontend sem regra de negócio | Pass | Validade do token, renovação, regra de senha e preferências são decididas no backend |
| II. Serviços não se comunicam | Pass | Só o `users-svc` é usado nesta task |
| II. Comunicação interna com mTLS | Pass | Gateway → BFFs e `admin-bff` → `users-svc`. Os outros serviços entram quando receberem chamadas |
| II. Escopo de página e `shared/` | Pass | Código usado por mais de uma página fica em `shared/` |
| II. SWR | Pass | Leitura com `useSWR` e mutações com `useSWRMutation`, encapsuladas em `services/` |
| II. MUI e mobile-first | Pass | Layout a partir de `xs`, com customização no tema |
| II. Storybook | Pass | Todo componente em `shared/components` tem `.stories.tsx` |
| III. Testes | Pass | Cobertura de 90% nos três projetos, Storybook nos dois temas e Cypress em viewport mobile |
| III. Pipelines de `/servers` | Pass | As pipelines Server e Infra validam os novos arquivos |
| IV. Hot-reload | Pass | Serviços novos não exigem rebuild, e os projetos seguem com volumes mapeados |
| V. Ciclo Speckit | Pass | Próximo passo: `/speckit-implement` |
