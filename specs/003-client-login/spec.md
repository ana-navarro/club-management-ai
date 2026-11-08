# Feature Specification: Login e cadastro do cliente

**Feature Branch**: `003-client-login`
**Created**: 2026-11-07
**Status**: Clarified
**Input**: User description: "Vamos fazer agora a página de login do cliente e diferente da do administrador (a unica diferença o resto é igual) devemos colocar o botão do cadastre, pois aqui nessa rota terá o cadastro, além de login via rede sociais como facebook e google. De resto será idêntico ao que temos no Admin. So muda a palleta de cores no cliente 224248, 325E6A, 44A1A4 e FF9A00. Lembrando que também tem dark mode versão português e inglês."

**Referência**: Tudo o que esta spec não muda segue as regras de [001-admin-login](../001-admin-login/spec.md), trocando o administrador pelo cliente.

## Clarifications

### Session 2026-11-07

- Q: Depois do cadastro, a conta precisa confirmar o email antes de entrar? → A: Sim. A conta só entra depois de confirmar o email pelo link enviado.
- Q: Quantas contas um email pode ter? → A: Uma só. O email identifica a conta, com qualquer meio de entrada.
- Q: Na primeira entrada por um provedor, quando já existe uma conta de cliente com o mesmo email? → A: A pessoa entra na conta que já existe, sem criar outra.
- Q: Instagram também? → A: Não. Só Google e Facebook.
- ~~Q: O Facebook não diz se o email é verificado. Ligar mesmo assim a uma conta existente? → A: Sim. A presença do email conta como verificado, e o risco foi aceito.~~ Substituída pela resposta abaixo.
- Q: O Facebook não diz se o email é verificado. Como tratar a primeira entrada por ele? → A: O Facebook precisa enviar a confirmação. Na primeira entrada de uma identidade do Facebook, o sistema manda um link ao email informado por ele, e só liga a identidade, ou cria a conta, depois que a pessoa confirma. O risco aceito antes deixa de existir (FR-014c).
- Q: O bloqueio por senhas erradas também bloqueia Google e Facebook? → A: Não. Vale só para a senha.
- Q: Em quais dispositivos o login vale? → A: Em celular e computador, incluindo o login por Google e Facebook.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar com email e senha (Priority: P1)

Um cliente abre o sistema, informa email e senha e entra, como o administrador faz no sistema dele, com a paleta do cliente, tema claro ou escuro e português ou inglês.

**Why this priority**: É a base das demais histórias, e sem ela nenhum cliente acessa o sistema.

**Independent Test**: Com uma conta de cliente criada por script, entrar com email e senha e chegar à página inicial, nos dois temas e nos dois idiomas.

**Acceptance Scenarios**:

1. **Given** um cliente sem sessão, **When** ele abre uma rota protegida, **Then** vai para a página de login.
2. **Given** um cliente com credenciais válidas, **When** ele entra, **Then** vai para a página inicial.
3. **Given** credenciais inválidas ou uma conta de administrador, **When** alguém tenta entrar, **Then** recebe a mesma mensagem de erro, que não diz o que está errado.
4. **Given** um cliente que errou a senha 3 vezes seguidas, **When** ele tenta de novo, **Then** o login fica bloqueado por 15 minutos e ele recebe um único email com o link para mudar a senha. O bloqueio vale só para a senha: a entrada por Google ou Facebook continua possível.
5. **Given** um cliente que esqueceu a senha, **When** ele segue o link da página de login, **Then** recupera a senha com as mesmas regras do administrador.
6. **Given** um cliente com sessão ativa, **When** ele usa o sistema continuamente, **Then** a sessão se renova sozinha e dura no máximo 12 horas.

---

### User Story 2 - Criar uma conta (Priority: P1)

Uma pessoa sem conta segue o botão de cadastro da página de login, cria a conta e começa a usar o sistema como cliente.

**Why this priority**: Clientes não são cadastrados por um administrador, então sem isso não há como ter contas novas.

**Independent Test**: Sem nenhuma conta, seguir o botão de cadastro, criar a conta, confirmar o email pelo link e entrar.

**Acceptance Scenarios**:

1. **Given** a página de login do cliente, **When** a pessoa a abre, **Then** vê o botão de cadastro.
2. **Given** um formulário com dados válidos, **When** a pessoa envia, **Then** a conta é criada com o tipo cliente e recebe o email de confirmação, conforme FR-010.
6. **Given** uma conta que ainda não confirmou o email, **When** ela tenta entrar com senha, **Then** não entra e pode pedir o reenvio do link.
7. **Given** o link de confirmação recebido, **When** a pessoa o segue, **Then** o email fica confirmado e ela consegue entrar.
3. **Given** dados inválidos ou campos vazios, **When** a pessoa envia, **Then** vê o erro no campo e nada é enviado.
4. **Given** um email que já tem conta, **When** a pessoa tenta se cadastrar, **Then** a resposta não revela que a conta existe.
5. **Given** o sistema do administrador, **When** alguém o abre, **Then** continua sem nenhum botão de cadastro.

---

### User Story 3 - Entrar com Google ou Facebook (Priority: P2)

Um cliente escolhe entrar com Google ou Facebook na página de login, confirma no provedor e volta ao sistema com a sessão aberta.

**Why this priority**: Facilita o acesso, mas o cliente consegue entrar e criar a conta sem isso.

**Independent Test**: Com um provedor simulado, entrar pelo Google e chegar à página inicial. Entrar pelo Facebook, confirmar pelo link do email e chegar à página inicial. Repetir os dois para ver que é a mesma conta e que o Facebook não pede outro email.

**Acceptance Scenarios**:

1. **Given** a página de login do cliente, **When** a pessoa a abre, **Then** vê as opções de Google e Facebook.
2. **Given** um cliente que confirma no Google, ou no Facebook já ligado à conta, **When** ele volta ao sistema, **Then** a sessão é aberta com as mesmas regras do login com senha.
3. **Given** uma pessoa que entra pela primeira vez pelo Google, **When** ela confirma, **Then** a conta é criada já confirmada, ou, se o email já tem conta de cliente, ela entra nessa conta, conforme FR-014.
4. **Given** uma pessoa que cancela no provedor ou um provedor indisponível, **When** ela volta ao sistema, **Then** vê uma mensagem clara, continua na página de login e pode tentar outro meio.
5. **Given** uma conta de administrador com o mesmo email, **When** alguém entra pelo Google no sistema do cliente, **Then** recebe a mesma mensagem de erro genérica, e nenhuma sessão é aberta. **When** entra por um Facebook ainda não ligado, **Then** vê o mesmo aviso para conferir o email de qualquer outro caso, nenhum email é enviado e nada é ligado.
6. **Given** uma identidade do Facebook ainda não ligada a nenhuma conta, **When** a pessoa confirma no Facebook, **Then** nenhuma sessão é aberta e nenhuma conta é criada ou ligada. Ela volta à página de login com o aviso para conferir o email, e recebe nesse email um link de confirmação, conforme FR-014c.
7. **Given** o link de confirmação do Facebook, **When** a pessoa o segue, **Then** vê o nome do perfil do Facebook e o email da conta, e escolhe entre confirmar e recusar. Ao confirmar, a identidade é ligada, ou a conta é criada já confirmada, e o botão "Continuar com Facebook" a leva à página inicial. Ao recusar, nada é ligado e o link deixa de valer.
8. **Given** uma identidade do Facebook já ligada a uma conta, **When** a pessoa entra pelo Facebook, **Then** entra direto, sem novo email.

---

### User Story 4 - Aparência do cliente (Priority: P2)

O sistema do cliente tem identidade própria, com a sua paleta, nos temas claro e escuro, em português e inglês.

**Why this priority**: Não muda o que o cliente consegue fazer, mas é um requisito explícito de todas as telas desta task.

**Independent Test**: Abrir cada tela nos 2 temas e nos 2 idiomas, em 390 px e em 1280 px.

**Acceptance Scenarios**:

1. **Given** qualquer tela desta task, **When** ela é aberta, **Then** usa as cores `#224248`, `#325E6A`, `#44A1A4` e `#FF9A00`.
2. **Given** a chave de idioma, **When** ela é alternada, **Then** todos os textos, incluindo os de Google e Facebook, mudam entre português e inglês.
3. **Given** o seletor de tema, **When** ele é alternado, **Then** todas as telas mudam entre claro e escuro.
4. **Given** uma escolha de tema e idioma na sessão, **When** a página é recarregada, **Then** a escolha continua, como no administrador.

### Edge Cases

- A conta foi criada só por Google ou Facebook e a pessoa pede a recuperação de senha: o link define uma senha para a conta, e os dois meios passam a funcionar.
- O provedor não informa um email, como pode ocorrer no Facebook: a conta não é criada, e a mensagem pede outro meio de entrada.
- O mesmo email é usado no Google e no Facebook: as duas entradas levam à mesma conta. No Facebook, só depois da confirmação pelo email.
- Alguém usa um perfil do Facebook com um email que não é dele: o link vai para a dona do email, que vê o nome desse perfil e pode recusar. Sem a confirmação, nada é ligado.
- A pessoa pede a entrada pelo Facebook várias vezes antes de confirmar: dentro de 1 minuto, o link já enviado continua valendo e nenhum outro sai. Depois disso, o novo link substitui o anterior. No máximo 5 emails por endereço em 24 horas.
- A conta já tem um Facebook ligado e a pessoa confirma o link de outro perfil do Facebook com o mesmo email: o novo substitui o anterior.
- Alguém dispara entradas pelo Facebook em massa para encher a caixa de uma pessoa: os limites por email e por rede cortam os envios, e a resposta não muda.
- O link de confirmação do Facebook expirou, já foi usado ou foi recusado: a pessoa vê uma mensagem e pode entrar pelo Facebook de novo para receber outro.
- A pessoa confirma o link do Facebook em outro dispositivo: a ligação vale, e ela entra pelo Facebook em qualquer dispositivo.
- A resposta do provedor é forjada, repetida ou de outra tentativa: é recusada, e nenhuma sessão é aberta.
- O cadastro é enviado duas vezes seguidas: só uma conta é criada.
- O email é digitado com maiúsculas ou espaços diferentes: é tratado como o mesmo email.
- O link de confirmação expirou ou já foi usado: a pessoa vê uma mensagem e pode pedir um novo.
- Alguém cadastra o email de outra pessoa e não confirma, e a dona do email entra depois pelo Google: ela fica com a conta, e a senha cadastrada antes deixa de valer.
- O login social começa no celular e o navegador abre o app do provedor: ao confirmar, a pessoa volta ao navegador com a sessão aberta.
- Muitos cadastros partem da mesma origem: o sistema limita as tentativas, para reduzir abuso.
- Login por provedor vindo de uma rede nova: envia o mesmo aviso por email do login com senha.
- Falhas no provedor não contam como senhas erradas nem bloqueiam a conta.

## Requirements *(mandatory)*

### Functional Requirements

**Login e sessão**

- **FR-001**: O sistema do cliente MUST ter login com email e senha, com as mesmas regras de sessão, tentativas, aviso de local novo e recuperação de senha de `001-admin-login`.
- **FR-002**: Apenas contas de cliente MUST conseguir entrar no sistema do cliente. Uma conta de administrador MUST receber a mesma mensagem de credenciais inválidas.
- **FR-003**: Apenas as páginas de login, cadastro, recuperação de senha, confirmação de email, confirmação do Facebook e retorno do login social MUST ser públicas. Todas as outras MUST exigir sessão.
- **FR-004**: O sistema do administrador MUST continuar recusando contas de cliente e sem cadastro nem login social.

**Cadastro**

- **FR-005**: A página de login MUST ter um botão que leva ao cadastro.
- **FR-006**: O cadastro MUST pedir nome, email, senha e confirmação da senha, validados antes do envio e novamente no backend.
- **FR-007**: A senha MUST seguir a mesma regra do administrador, com no mínimo 8 caracteres.
- **FR-008**: Toda conta criada pelo cadastro MUST ser do tipo cliente, sem que a tela possa escolher outro tipo.
- **FR-009**: O cadastro MUST NOT revelar se um email já tem conta.
- **FR-010**: Depois do cadastro, o sistema MUST enviar um email com um link de confirmação de uso único, válido por 24 horas, e a conta MUST NOT entrar com senha antes de confirmar o email. Quem tenta entrar sem confirmar MUST ver uma mensagem que oferece o reenvio do link, limitado a 1 envio por minuto. Seguir o link confirma o email e mostra a confirmação com um botão para a página de login.
- **FR-010a**: Um email MUST pertencer a uma só conta, sem diferença de maiúsculas e minúsculas e de espaços nas pontas, com qualquer meio de entrada. A unicidade MUST ser garantida também no banco, para que dois cadastros simultâneos não criem duas contas.
- **FR-010b**: O cadastro com um email que já tem conta MUST mostrar a mesma resposta de um cadastro novo. Se a conta existente já está confirmada, o sistema MUST enviar a ela um aviso de que alguém tentou se cadastrar, com o link para entrar ou recuperar a senha. Se ainda não está confirmada, MUST reenviar o link de confirmação.

**Login social**

- **FR-011**: A página de login MUST oferecer entrada com Google e com Facebook.
- **FR-012**: O sistema MUST validar a resposta do provedor no backend e MUST NOT guardar a senha da pessoa no provedor.
- **FR-013**: O login social MUST abrir uma sessão com as mesmas regras do login com senha.
- **FR-014**: Na entrada por um provedor, o sistema MUST procurar primeiro a conta já ligada a essa identidade do provedor, para que a troca de email no provedor não crie outra conta, e depois a conta com o email informado por ele. Se já existe uma conta de cliente com esse email, a pessoa MUST entrar nela, e a identidade social MUST ser ligada a ela, sem criar outra conta. Se não existe, a conta de cliente MUST ser criada já com o email confirmado. O Google MUST informar o email como verificado. Se não informar, ou se o Facebook não informar o email, a entrada MUST ser recusada com a mensagem de FR-015. No Facebook, a ligação e a criação só acontecem pela confirmação de FR-014c.
- **FR-014a**: Quando a conta existente ainda não confirmou o email, a entrada pelo provedor MUST confirmá-lo e MUST invalidar a senha que havia, para que quem cadastrou o email antes não mantenha acesso. A pessoa pode definir uma senha depois, pela recuperação de senha.
- **FR-014c**: Como o Facebook não informa se o email é verificado, uma identidade do Facebook ainda não ligada MUST NOT ser ligada a uma conta, nem criar uma, sem a confirmação pelo email. O sistema MUST enviar ao email informado pelo Facebook um link de uso único, válido por 24 horas, e mostrar na página de login o aviso para conferir o email, sem dizer se o email tem conta. A página do link MUST mostrar o nome do perfil do Facebook e o email, e MUST exigir uma ação explícita para confirmar ou recusar, sem confirmar só por abrir o link. Um novo pedido MUST invalidar o link anterior da mesma identidade, exceto dentro de 1 minuto do último envio para o mesmo email, quando o link já enviado MUST continuar valendo e nenhum outro é enviado. O envio MUST ser limitado a 5 por email em 24 horas, e os pedidos a 10 por hora por rede. Um email de administrador MUST receber o mesmo aviso, sem envio de email e sem pedido gravado. A confirmação MUST aplicar as regras de FR-014 e FR-014a. Se a conta já tem outra identidade do Facebook ligada, a confirmação MUST substituí-la pela nova. Uma identidade do Facebook já ligada MUST entrar direto.
- **FR-014b**: O login MUST funcionar em celular e computador, nos navegadores atuais. O login social MUST usar redirecionamento na mesma aba, sem janela pop-up, e MUST voltar à página de login ou à página inicial do mesmo dispositivo.
- **FR-015**: Falhas e cancelamentos no provedor MUST mostrar uma mensagem clara e manter a pessoa na página de login.

**Aparência**

- **FR-016**: As telas MUST usar a paleta `#224248`, `#325E6A`, `#44A1A4` e `#FF9A00`, nos temas claro e escuro.
- **FR-017**: Todos os textos MUST existir em português e inglês, com a mesma chave de idioma do administrador.
- **FR-018**: Tema e idioma MUST seguir as mesmas regras de sessão e de gravação no usuário do administrador.
- **FR-019**: As telas MUST funcionar sem rolagem horizontal em 390 px e em 1280 px e MUST passar na verificação de acessibilidade, incluindo contraste, nos dois temas.

**Escopo do backend**

- **FR-020**: Tudo o que for de usuários MUST ficar no serviço de usuários, e o frontend do cliente MUST chamar apenas o BFF do cliente, com a comunicação interna protegida como no administrador.

### Key Entities

- **Usuário**: o mesmo de `001-admin-login`. Uma conta social pode não ter senha até a pessoa definir uma.
- **Identidade social**: liga um usuário a uma conta do Google ou do Facebook, com o provedor e o identificador da pessoa nele. Um usuário pode ter uma de cada.
- **Pedido de ligação do Facebook**: uma primeira entrada pelo Facebook que espera a confirmação pelo email, com a identidade, o email, o nome do perfil e a validade do link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa sem conta cria a conta, confirma o email e chega à página inicial em até 3 minutos.
- **SC-001a**: Em 100% das tentativas, um email tem no máximo uma conta, inclusive com cadastros simultâneos e com entradas por Google e Facebook.
- **SC-002**: Um cliente com conta entra com email e senha em até 30 segundos.
- **SC-003**: Uma pessoa entra pelo Google, ou pelo Facebook já ligado, com no máximo 2 ações no sistema, além da confirmação no provedor. A primeira entrada pelo Facebook acrescenta só o link do email e a ação de confirmar.
- **SC-003a**: Em 100% das tentativas, uma identidade do Facebook não é ligada a nenhuma conta, nem cria uma, sem a confirmação pelo email.
- **SC-004**: 100% das telas passam na verificação de acessibilidade nos 2 temas.
- **SC-005**: 100% dos textos existem nos 2 idiomas, sem nenhum texto fixo em uma só língua.
- **SC-006**: Em 100% das tentativas com uma conta de administrador ou com uma resposta forjada do provedor, nenhuma sessão é aberta.
- **SC-007**: Todas as regras de sessão, tentativas e recuperação de senha de `001-admin-login` passam nos mesmos cenários no sistema do cliente.

## Assumptions

- A página inicial do cliente continua sendo só um ponto de chegada. O restante do sistema do cliente fica para outras tasks.
- A paleta define as cores da marca. Fundos e textos neutros podem ser derivados dela quando for preciso para o contraste, como ocorre com o tema escuro.
- Um email pertence a uma só conta, então uma pessoa não pode ser cliente e administrador com o mesmo email.
- O login social vale apenas para o sistema do cliente.
- O Facebook não informa se o email é verificado, então a presença do email não basta para ligar contas. Em 2026-11-07, o risco antes aceito foi substituído pela confirmação por email de FR-014c.
- Os provedores sociais são só Google e Facebook. O Instagram fica fora, porque a API de login para pessoas comuns foi descontinuada em dezembro de 2024 e a que restou não informa o email.
- Durante o desenvolvimento, os provedores retornam para `http://localhost:8080`, e o app do Facebook fica no modo de desenvolvimento.
- Logout e edição de perfil ficam fora do escopo, como no administrador.
- Os testes automatizados usam um provedor simulado. As credenciais de desenvolvimento do Google e do Facebook ficam em `.secrets.env` e só são usadas para testar à mão com os provedores reais.
- A publicação em produção fica fora do escopo. As URLs de retorno de produção serão cadastradas nos provedores nessa etapa.
