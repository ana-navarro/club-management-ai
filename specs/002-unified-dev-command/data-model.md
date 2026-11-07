# Data Model: Comando único para executar o ambiente de desenvolvimento

A task não cria dados persistentes. Estas são as estruturas que o script lê e decide.

## Serviço do ambiente

Vem de uma linha de `docker compose ps -a --format json`.

| Campo | Significado | Validação |
|-------|-------------|-----------|
| `Service` | Nome do serviço no Compose | Texto obrigatório |
| `State` | `created`, `running`, `exited`, `restarting` ou outro | Texto obrigatório |
| `Health` | `starting`, `healthy`, `unhealthy` ou vazio | Texto, pode estar vazio |
| `ExitCode` | Código de saída | Número |

Linhas fora desse formato geram erro claro, em vez de serem ignoradas.

### Decisão por serviço

| Condição | Resultado |
|----------|-----------|
| `running` e `healthy` | Pronto |
| `exited` com código 0 e serviço de certificados | Pronto |
| `exited` em qualquer outro caso | **Falhou** |
| `running` e `unhealthy` | **Falhou** |
| Qualquer outro estado | Esperando |

### Decisão do ambiente

```text
algum serviço falhou                → falha: mostra o serviço e seus logs
todos os serviços esperados prontos → pronto: mostra os endereços
passaram 10 minutos                 → falha: lista quem ainda espera
caso contrário                      → consulta de novo em 2 segundos
```

Um serviço esperado que não aparece na lista conta como "esperando". Os serviços esperados vêm de `docker compose config --format json`.

## Pré-requisito

| Nome | Como é verificado | Mensagem ao falhar |
|------|-------------------|--------------------|
| Docker | `docker info` | Pede para iniciar o Docker |
| Docker Compose | `docker compose version` | Pede para instalar ou atualizar |
| Repositórios | Pasta de cada projeto com seu arquivo de manifesto | Lista os que faltam e a URL de clone |
| Portas | Tentativa de abrir cada porta publicada | Cita a porta e a variável do `.env` |

Todos são verificados, e a mensagem lista todos os problemas de uma vez. Nada é iniciado se algum falhar.
