# Arquitetura — Mock Serasa Server

## Por que existe

É o "serviço externo" falso do desafio técnico (`README-CANDIDATO.md`). A aplicação do
candidato chama este mock como se fosse a API Serasa. Por isso ele é **propositalmente
instável**: atraso aleatório (padrão 2–60 s) e erros aleatórios (padrão 15%), para avaliar
timeout, retry e tratamento de erro do candidato. Rotas, headers, `reportName`, códigos de
status e formato das respostas são o contrato com os candidatos: mudá-los quebra o desafio.

## Fluxo de uma requisição

```
cliente
  -> src/index.ts: helmet, cors, compression, rate limit global (por IP), express.json, requestLogger
  -> src/routes/index.ts
       POST /security/iam/v1/client-identities/login   validateLoginRequest -> authController.login
       GET  .../person-information-report/v1/creditreport  authMiddleware -> validatePFReportRequest -> reportController.getPFReport
       GET  .../business-information-report/v1/reports     authMiddleware -> validatePJReportRequest -> reportController.getPJReport
       GET  /health                                          healthController.check
       *                                                     404 { error, path }
  -> services
       authService: gera token (base64 de { payload, hash HMAC-SHA256 }) e guarda num Map em memória
       reportService: lê payload-pf.json / payload-pj.json no start (process.cwd()),
                      sorteia erro (antes do atraso), espera MIN_DELAY..MAX_DELAY, devolve cópia do payload
  -> errorHandler (500 genérico)
```

## Decisões

- **Sem estado externo.** Tokens vivem só na memória do processo; reiniciar invalida todos.
  Payloads são arquivos JSON fixos com dados sintéticos.
- **Token não é JWT**, apesar do nome `JWT_SECRET`: é base64 de JSON com hash HMAC. Só vale
  se foi emitido por este processo.
- **Login aceita qualquer `Basic`**: o mock não confere usuário/senha.
- **Erro aleatório antes do atraso**: erros voltam rápido; sucesso demora.
- **Config lida uma vez no import** (`src/config/config.ts`). Testes fixam a env em
  `src/__tests__/env.ts` (jest `setupFiles`), antes de qualquer import.
- **Logs** com Winston; documento e credenciais são mascarados (`requestLogger`, `reportService`).

## Qualidade

- CI (`.github/workflows/ci.yml`) em PR e push na `master`: `npm ci`, typecheck, lint,
  testes com cobertura mínima, build e build/smoke da imagem Docker.
- Não há deploy neste repositório.
