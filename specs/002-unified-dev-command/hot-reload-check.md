# Verificação: hot reload e tempos

Executado em 2026-11-07, no Windows 11 com Docker Desktop, WSL2 e kernel 6.18.54.

## Hot reload (limite: 15 segundos)

| Projeto | Tempo | Outros projetos recarregaram? |
|---------|-------|-------------------------------|
| club-management-admin | 1,2 s, no navegador, sem recarregar a página | Não medido |
| club-management-client | 0,4 s, no navegador, sem recarregar a página | Não medido |
| club-management-admin-bff | 2,8 s | Não |
| club-management-client-bff | 2,8 s | Não |
| club-management-users-svc | 3,2 s | Não |
| club-management-scheduling-svc | 1,0 s | Não |
| club-management-payment-svc | 1,0 s | Não |
| club-management-championshp-svc | 1,0 s | Não |

Erro de sintaxe, corrigido em seguida: `scheduling-svc` voltou em 1,0 s, e `admin-bff` em 3,7 s.

## Subida

| Situação | Tempo (limite) |
|----------|----------------|
| Com volumes de dependências novos | 71 s |
| Depois de `npm run dev:down`, com dependências baixadas | 54 a 58 s (3 minutos) |
| Comando repetido com o ambiente em execução | 3 s, sem duplicar serviços |

## Mensagens de erro (limite: 10 segundos)

| Situação | Tempo | Código de saída |
|----------|-------|-----------------|
| Porta ocupada | 1,0 s | 1 |
| Repositório ausente | 1,1 s | 1 |
| Docker inacessível, simulado com um `DOCKER_HOST` inválido | 0,8 s | 1 |
| `package.json` inválido em um serviço | 11,6 s, com o serviço e o log | 2 |

## Limitações encontradas

- Um serviço Node.js que quebra depois de iniciar continua com o contêiner em execução, porque o `nodemon` espera uma correção. Nesse caso, o comando só informa quem está esperando ao chegar ao limite de 10 minutos.
- Ctrl+C durante os logs não foi testado, porque exige um terminal interativo.
- Linux é testado pela pipeline. macOS não foi testado.
