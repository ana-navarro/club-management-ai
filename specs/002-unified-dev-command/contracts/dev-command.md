# Contract: comandos de desenvolvimento

Todos são executados na raiz do workspace.

| Comando | O que faz | Sai com 0 quando |
|---------|-----------|------------------|
| `npm run dev` | Verifica, sobe, espera e acompanha os logs | A pessoa interrompe os logs com Ctrl+C |
| `npm run dev -- --detach` | Verifica, sobe e espera, sem acompanhar os logs | O ambiente fica pronto |
| `npm run dev:logs` | Acompanha os logs do ambiente em execução | A pessoa interrompe com Ctrl+C |
| `npm run dev:down` | Encerra o ambiente e mantém os dados | Nenhum serviço fica em execução |

## Códigos de saída

| Código | Significado |
|--------|-------------|
| 0 | Sucesso |
| 1 | Pré-requisito faltando; nada foi iniciado |
| 2 | Um serviço falhou ou o limite de 10 minutos passou; o ambiente continua como está, para investigação |

## Mensagem de ambiente pronto

```text
Ambiente pronto em 42s

  Client:          http://localhost:8080
  Admin:           http://localhost:8081
  Emails de teste: http://localhost:8025

Ctrl+C para de mostrar os logs. O ambiente continua em execução.
Para encerrar: npm run dev:down
```

As portas vêm da configuração do Compose, então refletem o `.env`.

## Mensagem de pré-requisito

```text
Não foi possível iniciar o ambiente:

  - Repositório não encontrado: services/club-management-users-svc
    Clone com: git clone https://github.com/ana-navarro/club-management-users-svc.git services/club-management-users-svc
  - Porta 8081 em uso. Libere a porta ou troque ADMIN_PORT em servers/club-management-server/.env
```

## Mensagem de serviço com falha

```text
O serviço users-svc falhou (código 1). Últimas linhas do log:

  ...

Para ver tudo: npm run dev:logs
```

## Garantias

- Executar `npm run dev` com o ambiente em execução não duplica serviços nem perde dados.
- `npm run dev:down` nunca apaga volumes.
- Nenhum comando troca branches nem altera arquivos versionados dos projetos.
- Nenhum comando imprime valores de `.env` ou `.secrets.env`.
