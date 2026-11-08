# Research: Login e cadastro do cliente

**Feature**: `003-client-login` | **Plan**: [plan.md](plan.md)

Cada item segue o formato Decisão, Motivo e Alternativas. O que não aparece aqui segue [001-admin-login](../001-admin-login/plan.md).

## R1. Fluxo OAuth e quem fala com o provedor

- **Decisão**: Authorization Code com PKCE (`S256`) e `state`, mais `nonce` no Google. O `users-svc` monta a URL do provedor, troca o código, valida a identidade e decide a conta. O `client-bff` só faz os redirecionamentos do navegador e guarda o cookie que liga a tentativa ao navegador.
- **Motivo**: a constituição põe todo o backend de usuários no `users-svc` (FR-020) e deixa o BFF como orquestrador. O fluxo com código mantém os segredos e os tokens do provedor fora do navegador (FR-012). PKCE e `state` impedem que um código roubado ou uma resposta de outra tentativa seja aceita.
- **Alternativas**: SDK JavaScript do Google e do Facebook no navegador, que devolve um token ao frontend para o backend validar. Foi descartado porque depende de pop-up ou de iframe, que falham no celular e com bloqueio de cookies de terceiros, e porque põe scripts de terceiros nas páginas públicas. Fluxo implícito: descontinuado nos dois provedores.

## R2. Celular e computador

- **Decisão**: redirecionamento na mesma aba, sem pop-up. O cookie de ligação usa `SameSite=Lax`, `HttpOnly`, `Path=/api/auth/` e validade de 10 minutos, e é aceito no retorno, que é uma navegação GET de primeiro nível. O retorno ao frontend vai para `/auth/callback`, com um código de uso único no fragmento (`#code=...`).
- **Motivo**: pop-ups são bloqueados ou abrem como aba nova no celular, e a aba original perde o contexto. `SameSite=Lax` sobrevive ao retorno do provedor, inclusive quando o celular abre o app do Google ou do Facebook e volta ao navegador. O fragmento não vai para o servidor, para logs nem para o `Referer`.
- **Limite conhecido**: o Google recusa login em navegadores embutidos de outros apps (erro `disallowed_useragent`), como o navegador interno do Instagram. Nesse caso, a pessoa volta com o erro `provider_unavailable` e a mensagem sugere abrir a página no navegador ou usar email e senha.
- **Alternativas**: devolver o JWT direto na URL de retorno. Descartado porque o JWT ficaria no histórico do navegador. Gravar a sessão em cookie: descartado para manter a sessão igual à do administrador, em `sessionStorage`.

## R3. Entregar a sessão ao frontend depois do provedor

- **Decisão**: o `users-svc` cria um código de troca aleatório, guardado só como hash, com validade de 60 segundos e uso único. O `client-bff` redireciona para `/auth/callback#code=...`, e a página chama `POST /api/auth/social/session` uma única vez por código, e recebe a mesma resposta do login com senha. Uma segunda chamada com o mesmo código falharia, então a página precisa resistir à montagem dupla do `StrictMode`.
- **Motivo**: o frontend continua recebendo a sessão por uma chamada à API, como no login com senha. Assim, a renovação, as preferências e o `sessionStorage` não mudam (FR-013).
- **Alternativas**: o BFF guardar a sessão do lado dele. Descartado porque exigiria estado no BFF.

## R4. Validação no Google

- **Decisão**: OpenID Connect. A troca do código usa `https://oauth2.googleapis.com/token` com o segredo e o `code_verifier`. O `id_token` é validado com `jose`, contra o JWKS do Google, conferindo assinatura, `iss` (um dos valores de `GOOGLE_ISSUERS`: `https://accounts.google.com` e `accounts.google.com` no Google real), `aud` igual ao client ID, `exp` e `nonce`. Só é aceito com `email_verified: true`. O identificador é o `sub`.
- **Motivo**: o `id_token` assinado prova a identidade sem outra chamada. O `jose` não tem dependências e funciona com JWKS remoto e cache.
- **Alternativas**: `google-auth-library`. Descartado porque é bem maior e não serve para o provedor simulado.

## R5. Validação no Facebook

- **Decisão**: o Facebook Login não é OpenID Connect no fluxo web. A troca do código usa `https://graph.facebook.com/{versão}/oauth/access_token`, com o segredo e o `code_verifier`. Depois, `GET /{versão}/me?fields=id,name,email` com `appsecret_proof`, que é o HMAC-SHA256 do token com o App Secret. O identificador é o `id`, válido só neste app. Sem o campo `email`, a entrada é recusada com `email_required`. A versão da Graph API vem de `FACEBOOK_GRAPH_VERSION`, e a implementação usa a mais recente disponível.
- **Motivo**: o `appsecret_proof` impede que um token de outro app seja usado. O token do Facebook não é guardado.
- **Email não verificado**: o Facebook não manda um campo de verificação, e o email devolvido pode não pertencer à pessoa (perfil antigo, email trocado e não confirmado, email reciclado pelo provedor). Por isso o email do Facebook nunca basta para ligar ou criar uma conta: a primeira entrada de cada identidade passa pela confirmação de R5a. O risco aceito antes foi retirado em 2026-11-07.
- **Escopo**: `email,public_profile`, por `FACEBOOK_SCOPE`. O Instagram fica fora (ver spec).
- **Alternativas**: Limited Login com OIDC. Descartado porque só existe nos SDKs de iOS.

## R5a. Confirmação da primeira entrada pelo Facebook (FR-014c)

- **Decisão**: no retorno do Facebook, depois de validar o perfil, o `users-svc` busca a conta pela identidade (`provider` + `subject`). Se achar, a entrada segue normal. Se não achar, não liga, não cria e não abre sessão. Para um email de administrador, não grava nem envia nada. Nos outros casos, grava um `socialLinkRequest` com a identidade, o email normalizado, o nome do perfil e o idioma, e manda ao email um link para `{CLIENT_APP_URL}/confirm-social-link?token=…`. O `client-bff` redireciona para `/login?social_notice=check_email`, com a mesma mensagem exista ou não a conta, inclusive para um administrador (US3.5).
- **Página do link**: ao abrir, busca o preview com `useSWRImmutable` chaveado pelo token, porque é uma leitura (constituição, SWR). `POST /api/auth/social/link/preview` só lê o pedido e devolve o provedor, o nome do perfil e o email. Nada é confirmado só por abrir o link, porque leitores de email e antivírus abrem links sozinhos. Os botões Confirmar e "Não fui eu" chamam `confirm` ou `decline` com `useSWRMutation`.
- **Confirmação**: marca o pedido como usado de forma atômica e aplica a ordem de R6 com o email do pedido: conta de administrador → link inválido; conta de cliente → liga a identidade, substituindo outra identidade do Facebook já ligada a ela, e, se não confirmada, aplica R7; nenhuma conta → cria um cliente confirmado, sem senha, com a identidade e o idioma do pedido. O email está provado, porque o link chegou a ele. Se a identidade já foi ligada a outra conta nesse meio-tempo (índice único), o link é inválido. Depois, a página mostra "Continuar com Facebook", que entra direto pela identidade já ligada.
- **Por que não abrir a sessão na confirmação**: o link pode ser aberto em outro dispositivo ou por outra pessoa. Exigir a nova entrada pelo Facebook garante que a sessão só abre para quem tem o Facebook e o email ao mesmo tempo, sem criar um novo caminho de emissão de sessão.
- **Substituição**: a conta guarda uma identidade por provedor. Se a pessoa confirma um perfil do Facebook diferente do que está ligado, o novo substitui o antigo. É seguro porque só a dona do email confirma, e evita que ela fique presa ao fluxo do email a cada entrada.
- **Abuso**: o link mostra o nome do perfil do Facebook, para a dona do email reconhecer um pedido que não fez e recusar. Se já houve um envio para o mesmo email há menos de 1 minuto, nada novo é criado e o link enviado continua valendo. Fora disso, um novo pedido da mesma identidade invalida o anterior. No máximo 5 emails por endereço em 24 horas, contados em `socialLinkRequests`, e 10 pedidos por hora por rede, em `socialLinkAttempts`, com o mesmo hash de prefixo de rede de R10. Acima de qualquer limite, a resposta é a mesma e nada é enviado. Validade de 24 horas, como a confirmação do cadastro, com TTL.
- **Alternativas**: aceitar a presença do email como verificação. Descartado em 2026-11-07, porque permitiria tomar uma conta existente. Exigir a senha da conta existente: descartado, porque não serve para contas sem senha nem para contas novas. Confirmar ao abrir o link: descartado pelo motivo acima.

## R6. Uma conta por email e ligação das identidades

- **Decisão**: o email é normalizado com `trim` e minúsculas antes de qualquer gravação ou busca, como já faz o `normalizeEmail`. O índice único em `users.email` continua sendo a garantia final. Na entrada social, a busca é feita primeiro pela identidade (`provider` + `subject`) e depois pelo email. As identidades ficam em `users.socialIdentities`, com índice único em `{ provider, subject }`.
- **Motivo**: buscar primeiro pela identidade mantém a pessoa na mesma conta se ela trocar o email no provedor. O índice único resolve cadastros e entradas simultâneos: quem perde a disputa recebe o erro de chave duplicada e segue como se a conta já existisse.
- **Ordem de ligação**: conta de administrador com o email → `invalid_credentials` no Google, e o aviso `check_email` sem envio no Facebook ainda não ligado, sem ligar nada (US3.5). Conta de cliente → liga a identidade. Se a conta não estava confirmada, aplica FR-014a. Nenhuma conta → cria um cliente confirmado, sem senha. No Facebook, os dois últimos passos só acontecem na confirmação de R5a.
- **Alternativas**: pedir a senha para unir as contas. Descartado na clarificação de 2026-11-07.

## R7. Proteção contra o pré-cadastro (FR-014a)

- **Decisão**: quando uma conta de cliente não confirmada é ligada a um provedor, pelo Google ou pela confirmação do Facebook (R5a), o `users-svc`, em uma única atualização, grava `emailVerifiedAt`, apaga `passwordHash` e incrementa `tokenVersion`. Logo depois, invalida os links de confirmação e de recuperação pendentes dessa conta.
- **Motivo**: quem cadastrou o email antes conhece a senha. Sem isso, essa pessoa entraria na conta depois que a dona do email a confirmasse pelo Google.
- **Alternativas**: recusar a entrada social até a conta ser confirmada. Descartado porque deixaria a dona do email bloqueada por um cadastro que não fez.

## R8. Confirmação de email

- **Decisão**: token aleatório de 32 bytes, guardado só como hash SHA-256, válido por 24 horas, de uso único. Um novo envio invalida o anterior. O link aponta para `{CLIENT_APP_URL}/verify-email?token=...`. A página chama `POST /api/auth/verify-email` uma única vez por token ao abrir, mesmo com o `StrictMode` montando a página duas vezes, e mostra o resultado com um botão para a página de login. A recuperação de senha também confirma o email, porque o link prova que a pessoa recebe os emails dessa conta.
- **Reenvio**: `POST /auth/resend-verification` sempre responde `202`. O envio só acontece se a conta for de cliente, ainda não confirmada, e o último envio tiver mais de 1 minuto (`users.verificationEmailSentAt`).
- **Login antes de confirmar**: com a senha certa e o email não confirmado, o `users-svc` responde `403 email_not_verified`. Isso só revela o estado para quem sabe a senha. Com a senha errada, a resposta continua `invalid_credentials`.
- **Alternativas**: confirmar com um código de 6 dígitos digitado na tela. Descartado porque o link é o mesmo padrão da recuperação de senha e funciona igual no celular.

## R9. Cadastro sem revelar a conta (FR-009, FR-010b)

- **Decisão**: `POST /auth/register` sempre responde `202` com o corpo vazio. O hash da senha é calculado sempre, para o tempo de resposta não mudar. O envio de email roda em segundo plano, como na recuperação de senha. Para um email que já tem conta: cliente confirmado ou administrador → aviso "alguém tentou se cadastrar" com link de login e de recuperação; cliente não confirmado → reenvio do link de confirmação, respeitando o limite de 1 por minuto.
- **Alternativas**: responder `409`. Descartado por FR-009.

## R10. Limite de cadastros por origem

- **Decisão**: no máximo 10 cadastros por hora por rede, usando o mesmo hash de prefixo de rede do aviso de local novo. Fica em `registrationAttempts`, com TTL. Como o MongoDB só apaga os documentos expirados a cada ~60 segundos, o adapter recomeça a contagem quando `expiresAt` já passou. Acima do limite, a resposta é `429 too_many_requests`. Cadastros sem IP não são limitados, o que só ocorre fora do gateway.
- **Motivo**: o IP vem do NGINX por `X-Real-IP`, que o cliente não consegue forjar (ver 001). O prefixo evita que trocar o último número do IP contorne o limite.

## R11. Token de um sistema usado no outro

- **Decisão**: os dois BFFs mandam `X-App-Type` (`ADMIN` ou `CLIENT`) em toda chamada ao `users-svc`. O middleware de autenticação recusa com `401` um token cujo `type` for diferente. O `admin-bff` passa a mandar `ADMIN`.
- **Motivo**: os dois sistemas usam o mesmo `JWT_SECRET`. Sem essa verificação, um token de administrador funcionaria no BFF do cliente. O cabeçalho é confiável porque só os BFFs alcançam o `users-svc` por mTLS.
- **Alternativas**: um segredo por sistema ou `aud` no token. Descartado nesta task porque mudaria a emissão e a renovação para pouco ganho em relação ao cabeçalho.

## R12. Links de email por sistema

- **Decisão**: `APP_URL` vira `ADMIN_APP_URL` e `CLIENT_APP_URL`. Cada email usa a URL do tipo da conta. O login social usa `CLIENT_APP_URL` para montar `redirect_uri` (`{CLIENT_APP_URL}/api/auth/{provider}/callback`).
- **Motivo**: hoje todos os links apontam para o administrador.

## R13. Bloqueio por senhas erradas e login social

- **Decisão**: o bloqueio de 15 minutos vale só para o login com senha. A entrada pelo provedor continua liberada durante o bloqueio e não zera nem soma tentativas.
- **Motivo**: o bloqueio protege contra quem tenta adivinhar a senha. Quem entra pelo Google ou por um Facebook já ligado provou que é a dona do email, e a spec manda que falhas no provedor não contem como tentativas.

## R14. Provedor simulado

- **Decisão**: um serviço pequeno em Python (FastAPI) em `/servers/club-management-infra/oauth-mock`, rodando na imagem `python:3.14-slim` com `pip install` ao subir e `--reload`, como os BFFs, sem `Dockerfile`, com rotas no formato do Google (`/google/authorize`, `/google/token`, `/google/jwks`) e do Facebook (`/facebook/dialog/oauth`, `/facebook/oauth/access_token`, `/facebook/me`). A tela de autorização tem um formulário com email, nome, "email verificado", "sem email" e os botões Confirmar e Cancelar, para os testes cobrirem os casos da spec. Ele assina o `id_token` com uma chave RSA gerada ao subir.
- **Motivo**: a constituição permite Python em `club-management-infra`, onde já está o Mailpit. Testes E2E e CI funcionam sem credenciais nem internet.
- **Configuração**: o `users-svc` recebe as URLs dos provedores por variáveis. O Compose aponta para o simulado por padrão. Para testar com os reais, basta definir as credenciais e as URLs em `servers/club-management-server/.env`.
- **Alternativas**: `navikt/mock-oauth2-server`. Descartado porque só simula OIDC e não o Facebook.

## R15. Paleta do cliente

Contrastes calculados pela fórmula da WCAG 2.1:

| Token | Claro | Escuro | Contraste |
|-------|-------|--------|-----------|
| `background.default` | `#F4F7F7` | `#16292D` | Neutros derivados de `#224248` |
| `background.paper` | `#FFFFFF` | `#224248` | |
| `text.primary` | `#224248` | `#F4F7F7` | 10,8:1 no papel claro, 10,0:1 no escuro |
| `text.secondary` | `#325E6A` | `#EEF4F4` | 7,1:1 / 9,7:1 |
| `primary.main` + texto | `#224248` + `#FFFFFF` | `#44A1A4` + `#16292D` | 10,8:1 / 4,95:1 |
| `secondary.main` + texto (botão de cadastro) | `#FF9A00` + `#224248` | `#FF9A00` + `#16292D` | 5,1:1 / 7,1:1 |
| Links | `#325E6A` | `#FF9A00` | 7,1:1 no claro, 5,1:1 sobre `#224248` |
| Foco e bordas | `#44A1A4` | `#44A1A4` | 3,05:1 sobre branco, 3,5:1 sobre `#224248` (mínimo de 3:1 para componentes) |

`#44A1A4` não é usado em texto no tema claro (3,05:1), e `#FF9A00` não é usado em texto sobre fundo claro (2,1:1).

## R16. Botões do Google e do Facebook

- **Decisão**: botões com contorno, fundo do papel, logotipo oficial em SVG e texto "Continuar com Google" / "Continuar com Facebook" traduzido, com a cor de texto do tema. Os logotipos ficam como componentes no frontend, sem carregar scripts dos provedores.
- **Motivo**: as diretrizes das duas marcas aceitam botões neutros com o logotipo. O azul do Facebook (`#1877F2`) com texto branco tem contraste de 4,2:1, abaixo de 4,5:1 (FR-019).
