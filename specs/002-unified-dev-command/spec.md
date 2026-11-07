# Feature Specification: Comando único para executar o ambiente de desenvolvimento

**Feature Branch**: `002-unified-dev-command`
**Created**: 2026-11-07
**Status**: Draft
**Input**: User description: "Então como a página de Esqueceu-se a senha existe vamos fazer agora uma página para a questão de executar todos os backends e infra em um unico comando, com isso vamos usar o docker para isso. Então a ideia aqui e criar um comando que executa todos os repos e ainda faz hot reload"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir tudo com um comando (Priority: P1)

A pessoa que desenvolve o projeto executa um único comando na raiz do workspace e todos os repositórios sobem juntos, com a infraestrutura de que dependem. Ela não precisa abrir um terminal por projeto nem lembrar a ordem de inicialização.

**Why this priority**: É o objetivo da task. Sem isso, cada um dos 8 projetos precisa ser iniciado à parte.

**Independent Test**: Com os repositórios clonados e nada em execução, executar o comando e entrar no admin com o administrador inicial.

**Acceptance Scenarios**:

1. **Given** os repositórios clonados e nenhum serviço em execução, **When** a pessoa executa o comando, **Then** todos os serviços ficam disponíveis sem nenhum outro passo manual.
2. **Given** o comando em execução, **When** a pessoa abre o admin e entra com o administrador inicial, **Then** o login funciona, passando por frontend, BFF, serviço de usuários e banco de dados.
3. **Given** o ambiente já em execução, **When** a pessoa executa o comando de novo, **Then** nenhum serviço é duplicado e nenhum dado é perdido.
4. **Given** um ambiente que já foi executado, **When** a pessoa o encerra e executa o comando de novo, **Then** os dados locais continuam lá.

---

### User Story 2 - Ver as alterações sem reiniciar (Priority: P1)

Com o ambiente em execução, a pessoa altera o código de qualquer projeto e vê o resultado sem executar o comando de novo e sem reconstruir nada.

**Why this priority**: O usuário pediu isso explicitamente, e o Princípio IV da constituição exige.

**Independent Test**: Alterar um arquivo em cada projeto e confirmar que a alteração passa a valer sem nenhuma ação manual.

**Acceptance Scenarios**:

1. **Given** o ambiente em execução, **When** a pessoa altera um arquivo de um frontend, **Then** a página mostra a alteração sem reiniciar o ambiente.
2. **Given** o ambiente em execução, **When** a pessoa altera um arquivo de um BFF ou serviço, **Then** apenas esse projeto recarrega e passa a responder com a alteração.
3. **Given** um erro de sintaxe salvo em um projeto, **When** a pessoa corrige o arquivo, **Then** o projeto volta a funcionar sem reiniciar o ambiente.

---

### User Story 3 - Saber o que está errado (Priority: P2)

Quando algo impede a execução, a pessoa recebe uma mensagem que diz o que falta e como resolver, antes de esperar a subida inteira.

**Why this priority**: Em um projeto com vários repositórios, a falta de um deles ou do Docker é a falha mais provável para quem acabou de chegar.

**Independent Test**: Renomear a pasta de um projeto, executar o comando e conferir a mensagem.

**Acceptance Scenarios**:

1. **Given** um repositório não clonado, **When** a pessoa executa o comando, **Then** a mensagem diz qual repositório falta e nada é iniciado.
2. **Given** o Docker parado, **When** a pessoa executa o comando, **Then** a mensagem diz que ele precisa ser iniciado.
3. **Given** um serviço que não consegue iniciar, **When** a pessoa acompanha a execução, **Then** consegue identificar qual serviço falhou e ver o erro dele.

---

### User Story 4 - Encerrar o ambiente (Priority: P3)

A pessoa encerra todo o ambiente de uma vez, sem perder os dados locais.

**Why this priority**: Completa o ciclo de uso, mas não impede o desenvolvimento.

**Independent Test**: Encerrar o ambiente e confirmar que nenhum serviço continua em execução.

**Acceptance Scenarios**:

1. **Given** o ambiente em execução, **When** a pessoa o encerra, **Then** nenhum serviço fica em execução e as portas ficam livres.

### Edge Cases

- Uma porta usada pelo ambiente já está ocupada: a mensagem indica qual porta e como trocá-la.
- Falta o arquivo `.env` de um projeto: o ambiente sobe com os valores de desenvolvimento.
- As dependências de um projeto mudam, por exemplo depois de um `git pull`: elas são instaladas ao reiniciar o ambiente, sem reconstruir nada à mão.
- O sistema operacional é Windows: o comando e o recarregamento funcionam da mesma forma, inclusive com arquivos em pastas compartilhadas com os contêineres.
- O kernel é 6.19 ou mais novo, em que o banco local atual não inicia: a mensagem explica o problema, em vez de deixar o serviço de usuários falhando sem explicação.
- Cada projeto está em uma branch diferente: o comando usa o que está na pasta de cada um e não troca nenhuma branch.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O projeto MUST oferecer um único comando, executado na raiz do workspace, que inicia todos os repositórios de `apps/` e `services/` e a infraestrutura local em contêineres.
- **FR-002**: O comando MUST funcionar em Windows, Linux e macOS.
- **FR-003**: O comando MUST iniciar os serviços na ordem de dependência, sem passos manuais.
- **FR-004**: Alterações de código em qualquer projeto MUST valer sem reconstruir imagens nem executar o comando de novo.
- **FR-005**: O comando MUST verificar, antes de iniciar, se o Docker está disponível e se todos os repositórios estão clonados, e informar o que falta.
- **FR-006**: O comando MUST informar quando o ambiente estiver pronto, com os endereços do client, do admin e da caixa de emails de teste.
- **FR-007**: A pessoa MUST conseguir acompanhar os logs de todos os serviços e identificar a qual serviço cada linha pertence.
- **FR-008**: O projeto MUST oferecer uma forma de encerrar todo o ambiente sem apagar os dados locais.
- **FR-009**: O ambiente MUST usar por padrão o banco e o servidor de email locais e MUST NOT se conectar a serviços reais de banco ou email sem uma configuração explícita.
- **FR-010**: O comando MUST NOT alterar branches nem arquivos versionados dos repositórios, nem exigir que segredos sejam versionados.
- **FR-011**: A comunicação interna continua protegida como definido na constituição; o comando MUST NOT desativá-la para facilitar o desenvolvimento.
- **FR-012**: O comando `/run-server`, previsto na constituição, MUST usar este mesmo comando, para existir uma só forma de iniciar o ambiente.
- **FR-013**: O uso do comando MUST estar documentado em um único lugar, junto com a forma de encerrar e os problemas comuns.

### Key Entities

- **Serviço do ambiente**: cada frontend, BFF, serviço de backend ou componente de infraestrutura em execução, com nome, estado e logs próprios.
- **Pré-requisito**: condição verificada antes de iniciar, como o Docker em execução ou um repositório clonado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com os repositórios clonados e o Docker em execução, uma pessoa inicia todo o ambiente com 1 comando e nenhum passo manual adicional.
- **SC-002**: Em uma máquina com as dependências já baixadas, o login do admin funciona em até 3 minutos depois de executar o comando.
- **SC-003**: Uma alteração salva em qualquer um dos 8 projetos vale em até 15 segundos, sem reiniciar o ambiente.
- **SC-004**: Em 100% dos casos de repositório ausente ou Docker parado, a mensagem indica o que falta em até 10 segundos.
- **SC-005**: Depois de encerrar o ambiente, nenhum serviço continua em execução e os dados locais continuam disponíveis na execução seguinte.

## Assumptions

- "Página" foi entendida como esta task. A entrega é um comando de terminal, sem tela no sistema.
- "Todos os repos" inclui os 2 frontends, além dos BFFs, dos serviços e da infraestrutura.
- O Docker é um requisito desta task, pedido pelo usuário, e precisa estar instalado na máquina.
- Clonar os repositórios fica fora do escopo: o comando só avisa quais faltam.
- Este comando é apenas para desenvolvimento local. Implantação em produção fica fora do escopo.
- O ambiente existente em `servers/` é o ponto de partida. A task preenche o que falta nele, sem criar outro.
- Trocar a versão do banco local fica fora do escopo. Até isso ser feito em outra task, o kernel 6.19 ou mais novo só recebe a mensagem explicativa.
