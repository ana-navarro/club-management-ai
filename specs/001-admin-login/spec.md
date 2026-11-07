# Spec: Login do administrador

## Objetivo

Permitir que o administrador do clube entre no sistema de verdade, com sessão que expira e se renova sozinha,
recuperação de senha por email, tema claro e escuro, e português e inglês.

## Para quem

Administradores do clube. O sistema é agnóstico de clube, então nenhum nome ou marca de clube aparece nas
telas públicas.

## Dentro do escopo

- Página de login em `club-management-admin`, com email e senha.
- Página pública de "esqueci a senha", com o pedido por email e a definição da nova senha pelo link recebido.
- Proteção de rotas: só `/login` e `/forgot-password` são públicas.
- Autenticação no `club-management-admin-bff` e no `club-management-users-svc`.
- Usuário com tipo, clubes, tema e idioma.
- Banco de dados Azure DocumentDB, com MongoDB local em desenvolvimento e testes.
- Envio de email pelo Brevo, com servidor de testes em desenvolvimento e testes.
- `.env` e `.env.example` em todos os projetos. Apenas o `.env.example` é versionado.
- Paleta `#071B2B`, `#167D8D`, `#B9E4E8` e `#EEEEEE`.
- Tema claro e escuro e chave de idioma entre português e inglês, salvos em `sessionStorage`.
- Um administrador inicial, criado por script, apenas nos ambientes de desenvolvimento e CI.

## Fora do escopo

- Cadastro de administradores, incluindo qualquer botão ou link para ele. Só um administrador poderá cadastrar
  outro, em outra task.
- Cadastro e gestão de clubes, e escolha de clube ativo quando o usuário tiver mais de um.
- Logout e o restante do sistema de administração.
- Login no `club-management-client` e seus temas.
- Publicação em produção, incluindo os certificados de produção e o HTTPS entre o navegador e o gateway.
- mTLS nos serviços que ainda não recebem chamadas de outro projeto: `scheduling-svc`, `payment-svc` e `championshp-svc`.

## Usuário

| Campo | Regra |
|-------|-------|
| Nome e email | Obrigatórios. O email é único |
| Senha | Guardada apenas como hash |
| Tipo | `ADMIN` ou `CLIENT` |
| Clubes | Um usuário pode pertencer a vários clubes |
| Tema | `light`, `dark` ou sem escolha |
| Idioma | `pt-BR`, `en` ou sem escolha |

## Sessão

- O token expira após **2 horas sem atividade**.
- Se houver atividade quando faltarem menos de 30 minutos, o token é renovado por mais 2 horas, sem interromper
  o usuário.
- Cada sessão dura no máximo **12 horas** desde o login, mesmo com atividade contínua. Depois disso, é preciso entrar
  de novo.
- O usuário pode ter várias sessões simultâneas, em dispositivos diferentes. Cada login abre uma sessão própria, com um
  token próprio.
- Atividade é clique, toque, tecla ou rolagem na página.
- Sem atividade, ao chegar a expiração, o token é removido e o usuário volta para `/login`, com um aviso de que
  a sessão expirou.
- Redefinir a senha invalida todos os tokens já emitidos para aquele usuário.
- Cada login e cada renovação geram um token novo, diferente de todos os anteriores, mesmo para o mesmo usuário.
- O token leva `id`, `name`, `email`, `type`, os `id` dos clubes do usuário e a identificação e o início da sessão. Esses dados podem ser lidos por quem tiver
  o token, então ele nunca leva senha, hash ou outro dado sensível.

## Tentativas de login

- Depois de **3 senhas erradas seguidas**, o login da conta fica bloqueado por 15 minutos, mesmo com a senha certa.
- No momento do bloqueio, o usuário recebe um email, no idioma dele, informando as tentativas e oferecendo um link para
  mudar a senha. É o mesmo link da recuperação de senha, com as mesmas regras.
- Um login certo zera a contagem. Mudar a senha pelo link zera a contagem e remove o bloqueio.
- A resposta é sempre a mesma, com ou sem bloqueio e exista ou não a conta, para não revelar quais contas existem.

## Login em local novo

- Um login certo vindo de uma rede que a conta nunca usou envia um email ao usuário, no idioma dele, com data, hora e navegador,
  e um link para mudar a senha.
- A rede é identificada pelo começo do IP: os três primeiros blocos no IPv4 e os três primeiros grupos no IPv6.
- O primeiro login da conta não envia email, porque ainda não há rede conhecida.
- O email não impede o login.

## Pedidos de recuperação de senha

- Cada email pode fazer no máximo **5 pedidos**. A contagem recomeça depois de uma troca de senha com sucesso ou 24 horas
  depois do primeiro pedido da contagem.
- A partir do sexto pedido, nenhum email é enviado, e a resposta continua a mesma.
- O link vale por **2 horas** e funciona uma única vez.
- O link é consumido quando a senha é trocada. Uma senha recusada pela regra não consome o link.
- Um novo pedido invalida o link anterior da mesma conta.
- Os links dos emails de tentativas e de local novo seguem as mesmas regras, mas não contam como pedidos.

## Comunicação interna

- As chamadas do NGINX para os BFFs e do `club-management-admin-bff` para o `club-management-users-svc` são criptografadas,
  e os dois lados se identificam com certificado.
- O `club-management-users-svc` recusa chamadas sem um certificado válido, mesmo dentro da rede interna.
- A chave privada e os certificados nunca são versionados.

## Contrato do BFF

| Rota | Corpo | Sucesso | Falha |
|------|-------|---------|-------|
| `POST /api/auth/login` | `{ email, password, preferences? }` | `200` com `{ token, expiresAt, renewAt, user }` | `401` |
| `POST /api/auth/refresh` | Token no cabeçalho | `200` com `{ token, expiresAt, renewAt }` | `401` |
| `POST /api/auth/forgot-password` | `{ email }` | `202`, exista ou não a conta | `5xx` |
| `POST /api/auth/reset-password` | `{ token, password }` | `204` | `400` com o motivo: link inválido ou expirado, ou senha fora da regra |
| `GET /api/users/me` | Token no cabeçalho | `200` com `user` | `401` |
| `PATCH /api/users/me/preferences` | `{ theme?, language? }` | `200` com `user` | `401` |

`user` é `{ id, name, email, type, clubs: [{ id, name }], preferences: { theme, language } }`. O BFF nunca entrega
outros campos do usuário, como hash de senha ou versão do token. `renewAt` diz a partir de quando o frontend pode
renovar o token, para que a regra dos 30 minutos fique no backend.

## Critérios de aceitação

### Login e rotas

1. Sem token, qualquer rota diferente de `/login` e `/forgot-password` redireciona para `/login`.
2. Um `ADMIN` com credenciais válidas vai para a página inicial.
3. Credenciais inválidas e um usuário `CLIENT` recebem a mesma mensagem de erro, que não diz o que está errado, e
   continuam em `/login`.
4. Com token, abrir `/login` redireciona para a página inicial.
5. Email inválido ou campos vazios mostram erro no campo e não enviam o formulário.
6. Durante o envio, o botão fica desabilitado e indica carregamento.
7. Uma resposta `401` em uma rota protegida remove o token e redireciona para `/login`.
8. Não há botão nem link de cadastro.
9. O token nunca aparece na URL nem em logs.

### Sessão

10. Um token sem renovação é rejeitado pelo backend depois de 2 horas.
11. Com atividade nos últimos 30 minutos de validade, o token é renovado sem interromper o usuário.
12. Sem atividade, a sessão termina ao chegar a expiração, com o aviso na página de login.
13. Um token emitido antes de uma redefinição de senha é rejeitado, inclusive para renovação.
13a. Dois logins seguidos do mesmo usuário, mesmo no mesmo segundo, geram tokens diferentes.
13b. O token traz os dados do usuário definidos em Sessão, atualizados a cada renovação, e nenhum dado sensível.

13c. Uma sessão não é renovada depois de 12 horas do login, e `expiresAt` nunca passa desse limite.
13d. Duas sessões do mesmo usuário funcionam ao mesmo tempo, e cada uma renova o próprio token.

### Tentativas de login

13e. A terceira senha errada seguida bloqueia o login por 15 minutos e envia um único email com o link para mudar a senha.
13f. Durante o bloqueio, a senha certa também é recusada, sem enviar outro email.
13g. A mensagem de erro é igual em todos os casos e avisa que, depois de 3 tentativas, um email é enviado à conta.
13h. Conta inexistente recebe a mesma mensagem, em tempo equivalente, e nenhum email é enviado.
13i. Depois de um login certo ou de mudar a senha pelo link, a contagem recomeça.

### Recuperação de senha

13j. Um login certo de uma rede nova envia o email de aviso, e um login de uma rede conhecida não envia.
13k. O primeiro login da conta não envia o aviso.

14. O pedido mostra a mesma mensagem genérica para qualquer email, sem revelar se a conta existe.
14a. O sexto pedido do mesmo email não envia email e mostra a mesma mensagem. Depois de uma troca de senha com sucesso ou de
     24 horas, os pedidos voltam a funcionar.
15. Para uma conta existente, o usuário recebe um email no seu idioma, ou no idioma da página se não tiver escolha.
16. O link do email abre `/forgot-password` em modo de nova senha, vale por 2 horas e funciona uma única vez.
17. Link inválido, expirado ou já usado mostra um erro e a opção de pedir outro.
18. A nova senha exige no mínimo 8 caracteres e confirmação. A tela valida antes de enviar, e o backend valida de novo. Depois de definida, o usuário vai para `/login`.

### Tema e idioma

19. A chave de idioma alterna todos os textos entre português e inglês.
20. O seletor de tema alterna entre claro e escuro.
21. Tema e idioma ficam em `sessionStorage`: continuam após recarregar a página e não valem para novas abas.
22. Sem escolha na sessão, o tema segue o sistema operacional. O idioma segue o navegador, usando inglês se não for
    português.
23. Ao entrar, as escolhas salvas no usuário substituem as da sessão. Se o usuário não tiver escolha salva, as da
    sessão são gravadas nele. O frontend envia as da sessão no login e aplica as que voltarem na resposta.
24. Com o usuário autenticado, mudar tema ou idioma também grava a escolha nele.

### Comunicação interna

24a. Uma chamada ao `users-svc` sem certificado, ou com um certificado de outra autoridade, é recusada.
24b. Uma chamada por HTTP sem criptografia ao `users-svc` ou a um BFF é recusada.
24c. O login completo funciona com tudo isso ativo.

### Layout e acessibilidade

25. As páginas funcionam sem rolagem horizontal em 390 px e em 1280 px.
26. Os dois temas passam na verificação de acessibilidade do Storybook, incluindo contraste de texto.

## Premissas

- O token fica em `sessionStorage`, com acesso isolado em um único módulo.
- O tipo `CLIENT` já existe no modelo, para evitar uma migração quando o login do cliente for criado.
