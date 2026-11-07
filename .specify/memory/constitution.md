# Club Management Constitution

## Core Principles

### I. Fronteiras dos Repositórios de Micro-Serviços

O sistema adota arquitetura de micro-serviços em múltiplos repositórios (multi-repo): cada projeto em `/apps` e `/services` MUST ter repositório git próprio. A raiz do workspace é o repositório `club-management-ai`, que versiona `/specs`, `/.specify`, `/.claude`, `/e2e`, `/servers` e a pipeline integrada. Código MUST ser alocado respeitando estritamente os seguintes diretórios:

- `/apps/club-management-client`: Frontend React (TypeScript) — aplicação focada em apresentação, UI mobile-first com Material UI (MUI), isolamento por páginas, consumo com `useSWR` e catálogo via Storybook. MUST conter somente a parte do cliente.
- `/apps/club-management-admin`: Frontend React (TypeScript) — aplicação focada em apresentação, UI mobile-first com Material UI (MUI), isolamento por páginas, consumo com `useSWR` e catálogo via Storybook. MUST conter somente a parte do admin do clube.
- `/services/club-management-admin-bff`: Backend for Frontend (Python) do frontend admin — orquestrador dos micro-serviços internos e sanitizador de dados para o frontend; coordena as chamadas entre serviços e entrega à UI apenas os dados necessários. As regras de negócio de cada domínio ficam nos serviços.
- `/services/club-management-client-bff`: Backend for Frontend (Python) do frontend cliente — orquestrador dos micro-serviços internos e sanitizador de dados para o frontend; coordena as chamadas entre serviços e entrega à UI apenas os dados necessários. As regras de negócio de cada domínio ficam nos serviços.
- `/services/club-management-users-svc`: Serviço de Usuários (Node.js/TypeScript) — todo o backend relacionado a usuários, como login, recuperação de senha, cadastro de clubes e classificações.
- `/services/club-management-scheduling-svc`: Serviço de Agendamento (Node.js/TypeScript) — domínio de aluguéis e agenda.
- `/services/club-management-payment-svc`: Serviço de Pagamentos (Node.js/TypeScript) — domínio de pagamentos.
- `/services/club-management-championshp-svc`: Serviço de Campeonatos (Node.js/TypeScript) — domínio de campeonatos.
- `/servers/club-management-server`: Infraestrutura e Gateway de Rede — configurações de NGINX, orquestração local (`docker-compose.yml`), variáveis globais e scripts de subida.
- `/servers/club-management-infra`: Infraestrutura de outros servidores, como de email e WhatsApp. MAY ser implementada em Python.
- `/e2e/club-management-client`: Testes automatizados com Cypress da parte do cliente.
- `/e2e/club-management-admin`: Testes automatizados com Cypress da parte do admin.

**Variáveis de ambiente**: Todo projeto MUST ter um `.env` e um `.env.example`. Apenas o `.env.example` MUST ser versionado, sem valores reais. Os arquivos `.env` e `.secrets.env` NUNCA podem ser enviados a um repositório, e cada `.gitignore` MUST bloqueá-los.

**Rationale**: Manter fronteiras explícitas impede o acoplamento entre regras de negócio desiguais (ex: regras financeiras dentro do serviço de agendamento), permitindo escalabilidade e evolução autônoma de cada domínio.

### II. Arquitetura Hexagonal, Frontend Modular e Clean Code

O fluxo de dados MUST respeitar a direção: Frontend → BFF correspondente → Micro-Serviços de Domínio (`club-management-users-svc`, `club-management-scheduling-svc`, `club-management-payment-svc`, `club-management-championshp-svc`). `club-management-client` MUST consumir somente `club-management-client-bff`, e `club-management-admin` MUST consumir somente `club-management-admin-bff`. Saltos diretos entre Frontend e os serviços de domínio são terminantemente PROIBIDOS.

- **Frontend**: MUST se limitar a apresentação e validação de formato. Regras de negócio MUST ficar no backend.
- **BFF**: MUST orquestrar os serviços e limpar os dados entregues ao frontend. Quando uma operação envolver mais de um serviço, é o BFF que MUST coordenar as chamadas.
- **Serviços**: SHOULD NOT se comunicar entre si. Exceções MUST ser justificadas no `Constitution Check` do plano.
- **Comunicação interna**: Toda chamada entre gateway, BFF e serviços MUST usar mTLS, com criptografia e certificado nos dois lados. Um serviço MUST recusar quem não apresentar um certificado válido. Um serviço passa a seguir esta regra na primeira task em que receber chamadas de outro projeto.

- **Tipagem estrita**: Código TypeScript MUST NOT usar `as`, `!`, `any`, `unknown` ou `never`. Dados externos MUST ser validados em tempo de execução, e valores opcionais MUST ser tratados com verificações. O ESLint de cada projeto MUST reprovar esses usos.

#### 1. Backend (Arquitetura Hexagonal)

Todos os micro-serviços em Node.js/TypeScript e os BFFs em Python MUST adotar a Arquitetura Hexagonal:

- `application/`:
  - `controllers/`: Recebimento de requisições HTTP e tratamento de status de rede.
  - `routes/`: Definições de rotas e mapeamento de endpoints.
  - `middlewares/`: Autenticação, autorização, validação de tokens e guards.
  - `dto/`: Interfaces e esquemas de validação de payload de entrada/saída (Zod ou Pydantic).
- `domain/`:
  - `usecases/`: Nos serviços, contém TODAS as regras de negócio puras. Nos BFFs, contém a orquestração das chamadas. Não acessa bibliotecas de infraestrutura.
  - `models/`: Entidades e regras intrínsecas de domínio.
  - `ports/`: Interfaces abstratas de Input (usadas pelos controllers) e Output (usadas pelos usecases para falar com adapters).
- `infra/`:
  - `adapters/`: Implementações concretas de banco de dados, chamadas HTTP externas e SDKs. MUST existir **um adapter por verbo/ação**.
  - `schemas/`: Estruturas de mapeamento de banco (ORM, query builders, ODM).
- `config/`: Configurações de ambiente, injeção de dependências e clientes de conexão.

**Regras Backend**:

1. Usecases interagem com a camada de infraestrutura EXCLUSIVAMENTE via Output Ports.
2. Controllers interagem com as regras de negócio EXCLUSIVAMENTE via Input Ports.
3. Arquivos de backend MUST seguir a convenção `[verbo]-[funcionalidade]-[tipo]` (ex.: `create-user-usecase.ts`, `send-email-adapter.ts`). Em Python, MUST usar `_` em vez de `-`, pois módulos com hífen não podem ser importados (ex.: `create_user_usecase.py`).

#### 2. Frontend React (`/apps/club-management-client` e `/apps/club-management-admin`): Modularidade, SWR e UI System

A arquitetura dos frontends adota a segregação estrita por **escopos de página (Feature/Page-based)**, design visual baseado em **Material UI (MUI)**, documentação com **Storybook** e consumo de dados via **`useSWR`**:

**Estrutura de Pastas Padrão (Frontend)**:

- `src/shared/`: Recursos globais, transversais e agnósticos a uma única página.
  - `components/`: Componentes base reutilizados por duas ou mais páginas (ex.: `AppButton`, `AppModal`).
  - `hooks/`: Hooks utilitários globais (ex.: `useDebounce`, `useResponsive`).
  - `services/`: Configuração base do cliente HTTP (Axios/Fetch) e provider global do SWR.
  - `theme/`: Configuração e customização do tema do Material UI (MUI theme, tokens, breakpoints).
  - `utils/`: Funções puras (formatação de moeda, datas, máscaras).
- `src/pages/`: Módulos autônomos por página/conjunto de rotas.
  - Estrutura de `src/pages/[PageName]/`:
    - `components/`: Componentes visuais **exclusivos** deste conjunto de páginas.
    - `services/`: Funções de consulta e mutação de dados que MUST encapsular o hook `useSWR` (ou `useSWRMutation`).
    - `hooks/`: Hooks com lógica de estado e controle exclusivos da página.
    - `contexts/`: React Contexts específicos para evitar prop drilling dentro do fluxo da página.
    - `reducers/`: Reducers/State machines para fluxos complexos locais.
    - `index.tsx`: Ponto de entrada (View) da página.

**Regras de Escopo e Elevação (Promotion Rule)**:

1. **Privacidade de Módulo**: Componentes, hooks, services, contexts e reducers alocados dentro de uma pasta em `src/pages/[PageName]/` são de uso EXCLUSIVO daquele conjunto de páginas. É estritamente PROIBIDO que `PageA` importe elementos privados de `PageB`.
2. **Elevação para `shared/`**: Se um componente, hook ou serviço inicialmente criado dentro de uma página passar a ser necessário para outra página distinta, ele MUST ser refatorado e promovido para `src/shared/` antes de ser consumido pelo novo contexto.

**Formulários**: Todo formulário MUST ser validado com um schema Zod antes do envio ao BFF, e os dados enviados MUST ser os validados pelo schema. Essa validação não substitui a do backend, que continua decidindo.

**Gerenciamento de Dados e API (SWR)**:

1. Todas as chamadas de leitura, sincronização e cache de dados do frontend MUST utilizar **`useSWR`**.
2. É proibido usar `useEffect` manual com `useState` para busca inicial de dados de API.
3. Operações de mutação (POST, PUT, DELETE) MUST usar `useSWRMutation` ou disparar revalidações atômicas com `mutate()`.

**Design System, MUI e Storybook**:

1. **Material UI (MUI)**: É a biblioteca base de componentes. Toda customização visual MUST ser feita estendendo o tema global do MUI (`theme/`) ou via styled components/sx prop com suporte nativo a breakpoints mobile.
2. **Mobile-First Obrigatório**: Todos os componentes (inclusive tabelas) MUST ser prototipados e codificados primeiro para viewport de smartphone (`xs`/`sm`), expandindo fluidamente para telas maiores (`md`/`lg`).
3. **Storybook**: Todo componente promovido para `src/shared/components/` MUST ter um arquivo correspondente `.stories.tsx`, documentando seus estados visuais (ex.: `Default`, `Loading`, `Disabled`, `MobileViewport`) utilizando o tema do MUI.

### III. Estratégia de Testes e Portões de Qualidade (Quality Gates)

- **Backend (Node.js/TypeScript)**: `Vitest` ou `Jest` para testes unitários; `Supertest` para testes de integração de rotas.
- **Backend (Python BFF)**: `pytest` para testes unitários e de integração de rotas.
- **Frontend (React)**:
  - `Jest` / `Testing Library` para componentes e hooks (`shared` e `pages`).
  - `Storybook Test Runner` para validar regressão visual e acessibilidade de componentes compartilhados.
  - `Cypress` para testes de fluxo E2E simulando dispositivos móveis (viewport mobile obrigatório).
- A cobertura mínima de testes unitários MUST ser de **90% das linhas** (excluindo arquivos de mock e stories).
- A ausência de testes MUST reprovar a pipeline.
- **Pipeline de cada repositório**: Cada repositório de `/apps` e `/services` MUST ter uma pipeline no GitHub Actions com testes unitários e validação de lint (ESLint em Node.js/TypeScript, Ruff em Python). Testes E2E não fazem parte desta pipeline.
- **Pipeline integrada (`club-management-ai`)**: Todo commit em qualquer repositório do projeto MUST disparar uma pipeline em `club-management-ai` com testes unitários, lint e testes de componentes de todos os projetos, além dos testes E2E com Cypress de `/e2e`, executados contra o ambiente completo do `docker-compose.yml`.
- **Pipelines de `/servers`**: Cada projeto de `/servers` MUST ter uma pipeline própria no repositório `club-management-ai`, disparada quando seus arquivos mudam, além de fazer parte da pipeline integrada.
- **Regra de Work In Progress (@wip)**: Qualquer arquivo anotado com `@wip` MUST ser pulado na execução dos testes e MUST ser excluído do cômputo da meta de cobertura durante a iteração de desenvolvimento.

### IV. Infraestrutura com Hot-Reloading

A pasta `/servers/club-management-server` MUST conter os manifestos `docker-compose.yml` e NGINX configurados com mapeamento de volumes para desenvolvimento local. Todas as alterações em arquivos de frontend (React/Storybook) e backend (Node.js / Python) MUST refletir em tempo real (hot-reloading) sem necessidade de reconstrução (`rebuild`) das imagens Docker.

### V. Workflow de Implementação Automatizada (Ciclo Speckit)

A esteira de automação de novas funcionalidades MUST seguir estritamente o ciclo de 4 etapas:

1. **Planejamento (`/speckit-task`)**: Cria o diretório de contexto em `/specs/[###-feature]` com um checklist detalhado das portas, usecases, adapters, rotas, componentes (locais ou `shared/`), stories e testes a serem construídos.
2. **Execução (`/speckit-implement`)**: Implementa o código estritamente dentro dos parâmetros do checklist da task ativa, sem gerar commits nem interagir com branches remotas.
3. **Commit Headless (`/speckit-validate`)**: Reconcilia o checklist marcando os itens concluídos e justificando omissões. Executa a varredura contra inclusão inadvertida de segredos (`.env`, certificados, credenciais). Realiza o commit diretamente em cada repositório afetado, com Conventional Commits em inglês, **SEM exibir arquivos modificados para revisão e SEM solicitar aprovação interativa do usuário**.
4. **Finalização (`/speckit-complete`)**: Realiza `git push` de todas as branches pendentes de cada repositório afetado, aguarda a aprovação das pipelines de CI (GitHub Actions) e apenas consolida a task após o sucesso das execuções remotas.

## Comandos de Desenvolvimento (Prompt Commands)

### Comandos de Workflow Speckit

- `/speckit-task [descrição]`:
  - Se os requisitos estiverem vagos, solicita detalhamento imediato.
  - Cria o diretório `specs/[###-feature]/`.
  - Gera o arquivo de planejamento com checklist estruturado por camadas e módulos de frontend.
- `/speckit-implement`:
  - Carrega a task ativa e seu respectivo checklist.
  - Implementa as alterações de código exclusivamente nos arquivos necessários.
  - NÃO realiza commits, pushes ou validações de CI.
- `/speckit-validate`:
  - Atualiza o status do checklist da task em `/specs/[###-feature]`.
  - Verifica ausência de arquivos sensíveis (`.env`, tokens) no staging.
  - Executa diretamente o commit das alterações em cada repositório afetado, utilizando Conventional Commits (ex.: `feat(club-management-client): add shared button with storybook`), **sem pedir confirmação ao usuário e sem listar diffs arquivo a arquivo**.
- `/speckit-complete`:
  - Executa `git push` nos repositórios afetados pela tarefa.
  - Monitora o status das GitHub Actions dos repositórios impactados.
  - Se a CI falhar: interrompe a finalização e aponta a falha.
  - Se a CI passar: gera e envia o commit de fechamento da task.
- `/speckit-merge-main [nome-da-branch]`:
  - Faz o merge da branch em `main` e o push em cada repositório que a possui, com os projetos primeiro e `club-management-ai` por último.
  - Antes de qualquer merge, verifica em todos esses repositórios se o working tree está limpo, se a CI da branch passou e se não há conflitos. Se algo falhar, não faz merge em nenhum.
  - NÃO usa force push e NÃO apaga a branch.

### Comandos de Utilitários

- `/test-unit`: Executa as suítes de testes unitários locais, ignorando arquivos marcados com `@wip`.
- `/test-storybook`: Executa o test-runner do Storybook para validar integridade de stories e acessibilidade.
- `/run-storybook`: Inicializa o servidor local do Storybook na porta padrão do frontend.
- `/run-server`: Inicializa o ecossistema com Docker Compose em `/servers/club-management-server` com hot-reloading ativo.
- `/run-pipeline`: Executa a esteira de validação local completa (linter, tipagem estática, testes e meta de cobertura mínima de 90% das linhas).

## Governance

- Esta Constituição tem autoridade máxima sobre qualquer padrão prévio ou preferência de formatação ad-hoc no projeto.
- Emendas aos princípios exigem:
  1. Registro claro no cabeçalho de impacto (`Sync Impact Report`).
  2. Ajuste na versão de acordo com SemVer.
  3. Atualização do campo `Last Amended`.
- **Política de Versionamento Semântico**:
  - `MAJOR`: Quebra de retrocompatibilidade de contratos, alteração de premissas da arquitetura hexagonal ou mudança estrutural no Speckit.
  - `MINOR`: Adição de novos serviços, novas convenções de frontend/MUI/SWR ou novos comandos.
  - `PATCH`: Ajustes de documentação, esclarecimento de termos ou correções textuais.
- **Conformidade**: Todo plano de implementação MUST passar pelo `Constitution Check` antes da pesquisa e novamente após o design. Violações MUST ser justificadas na tabela de complexidade do plano.

**Version**: 4.4.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06
