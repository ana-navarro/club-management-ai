# Research: Comando único para executar o ambiente de desenvolvimento

## 1. Como oferecer o mesmo comando em Windows, Linux e macOS

- **Decision**: script Node.js sem dependências, chamado por `npm run dev` a partir de um `package.json` na raiz.
- **Rationale**: Node.js 24 já é necessário no host para rodar o Cypress e os testes. Funciona igual nos 3 sistemas e permite testes unitários.
- **Alternatives considered**: `sh` e `Makefile` não existem no Windows por padrão. Python exigiria mais uma ferramenta no fluxo de quem desenvolve. Só `docker compose up` não verifica pré-requisitos nem avisa quando está pronto.
- **Consequência**: além do Docker, a pessoa precisa de Node.js no host.

## 2. Como saber que o ambiente está pronto

- **Decision**: verificações de saúde no Compose para todos os serviços de longa duração. O script executa `docker compose up -d` e consulta `docker compose ps -a --format json` até todos ficarem saudáveis, com limite de 10 minutos.
- **Rationale**: é a única forma de cobrir tudo sem efeitos colaterais. O estado também fica visível em `docker compose ps`.
- **Alternatives considered**:
  - `docker compose up --wait`: testado com Compose 5.5.1. Ele aceita o serviço de certificados que termina com sucesso, mas **retornou 0 mesmo com um serviço sem verificação de saúde terminando com erro 7**. Não basta para detectar falhas.
  - Login do administrador, usado hoje no CI: cria uma sessão a cada subida e cobre só o caminho do admin.
  - `POST /api/auth/refresh` sem token: o BFF responde 401 sem chamar o `users-svc`, então não prova nada.
  - Procurar `listening on port` nos logs: frágil, e uma mudança de texto quebraria a espera.

## 3. Como verificar a saúde sobre mTLS

- **Decision**: scripts pequenos montados como somente leitura. O `users-svc` e os BFFs chamam a própria rota `/health` usando o próprio certificado, que já tem `serverAuth` e `clientAuth`.
- **Rationale**: mantém o mTLS sem nenhuma exceção (FR-011).
- **Alternatives considered**: abrir uma porta sem TLS só para saúde, recusado porque enfraquece a regra da constituição.
- **A confirmar na implementação**: `users-svc` e BFF precisam aceitar a própria identidade como cliente. Hoje a validação é pela CA, então a expectativa é que aceitem.

## 4. Como detectar falhas cedo

- **Decision**: a cada consulta, qualquer serviço terminado com código diferente de 0 interrompe a espera. O script mostra as últimas 50 linhas de log desse serviço e encerra com erro.
- **Rationale**: atende à User Story 3 e evita a espera silenciosa que ocorreu no CI da task 001.

## 5. MongoDB no kernel 6.19 ou mais novo

- **Decision**: não bloquear com antecedência. Se o `mongo` falhar e `docker info` indicar kernel 6.19 ou mais novo, a mensagem de erro acrescenta a explicação e o link para SERVER-121912.
- **Rationale**: o [problema](https://jira.mongodb.org/browse/SERVER-121912) afeta o MongoDB 8.0 em diante e está fechado, sem versão de correção informada. Um bloqueio antecipado pararia de fazer sentido quando a imagem fosse corrigida, e a pessoa ficaria impedida sem necessidade.
- **Alternatives considered**: trocar a imagem agora, deixado fora do escopo na spec.

## 6. Subidas seguintes rápidas

- **Decision**: volumes nomeados para `node_modules` de cada projeto Node.js e para o cache do pip dos BFFs. `npm run dev:down` usa `docker compose down`, sem `-v`.
- **Rationale**: hoje `node_modules` fica em um volume anônimo, e os pacotes Python ficam na camada do contêiner. Depois de `down`, contêineres novos instalariam tudo de novo, o que ameaça o limite de 3 minutos (SC-002).
- **Alternatives considered**: usar `docker compose stop` no encerramento, que deixaria contêineres parados e não cobre mudanças na definição deles. Criar imagens próprias, recusado porque o Princípio IV pede que nada precise ser reconstruído.
- **Consequência**: quem já usa o ambiente instala as dependências uma vez mais, na primeira subida.

## 7. Dependências que mudam

- **Decision**: manter `npm install` e `pip install` no início de cada serviço.
- **Rationale**: ao reiniciar o ambiente, as dependências novas são instaladas, como a spec pede.

## 8. Porta ocupada

- **Decision**: antes de subir, tentar abrir cada porta publicada, lida de `docker compose config --format json`. Portas do próprio ambiente em execução são ignoradas.
- **Rationale**: respeita `.env` sem interpretar o arquivo, e a mensagem cita a porta e a variável para trocá-la.

## 9. Ctrl+C durante os logs

- **Decision**: Ctrl+C para só o acompanhamento dos logs, e o ambiente continua. O encerramento é com `npm run dev:down`, e a mensagem final lembra disso.
- **Rationale**: é possível sair e voltar sem esperar a subida de novo; `npm run dev:logs` retoma os logs.
- **Alternatives considered**: encerrar tudo com Ctrl+C, como `docker compose up` faz. É mais familiar, mas interromperia o ambiente quando só se queria fechar o terminal.

## 10. Hot reload dos frontends pelo gateway

- **Decision**: manter a configuração atual e comprovar no navegador pelas portas 8080 e 8081.
- **Rationale**: o NGINX já repassa `Upgrade`, e o Vite já usa polling no contêiner. O caminho completo ainda não foi verificado, então ele faz parte do quickstart e pode gerar ajuste na implementação.

## 11. Banco e email reais

- **Decision**: nesta task, nada muda. O Compose define o banco e o SMTP locais em `environment`, que tem prioridade sobre `.env`, e `.secrets.env` não é lido.
- **Rationale**: atende à FR-009. A configuração para usar Azure e Brevo pertence à T152 da task 001.
