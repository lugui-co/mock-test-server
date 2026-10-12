# AGENTS.md — mock-test-server (Mock Serasa Server)

Instruções para agentes de IA. Tudo aqui foi conferido em 2026-10-11 contra o código
(commit `807a53b`) e rodando os comandos; o que não foi conferido está marcado.

## 1. O que é

Servidor HTTP (Express + TypeScript) que simula a API Serasa: login, relatório PF e relatório PJ.
É usado no desafio técnico de candidatos (ver `README-CANDIDATO.md`): a aplicação do candidato
chama este mock. Ele não chama nenhum serviço externo; responde com os JSON fixos
`payload-pf.json`/`payload-pj.json`, com atraso aleatório e erros aleatórios de propósito.

## 2. Mapa do código

- `src/index.ts` — ponto de entrada: monta o Express (helmet, cors, compression, rate limit global), carrega payloads, `listen`, limpeza de tokens a cada 60 s.
- `src/config/config.ts` — toda a configuração, lida de `process.env` **uma vez, no import** (com `dotenv`).
- `src/routes/index.ts` — as 4 rotas + 404 genérico.
- `src/controllers/` — `authController` (login), `reportController` (PF/PJ, converte erro em status), `healthController`.
- `src/services/authService.ts` — gera/valida token (base64 de JSON + HMAC SHA-256), guardado num `Map` em memória.
- `src/services/reportService.ts` — lê os payloads do disco (`process.cwd()`), sorteia erro e atraso, troca o documento na resposta.
- `src/middleware/` — `authMiddleware` (Bearer), `validation` (Joi para `reportName`/`X-Document-id`, Basic no login), `requestLogger`, `errorHandler`.
- `src/types/index.ts` — interfaces de resposta/token. `src/utils/logger.ts` — Winston (arquivo só em `NODE_ENV=production`).
- `src/__tests__/` — testes Jest (`*.test.ts`) e `setup.ts`.
- `payload-pf.json`, `payload-pj.json` — respostas fixas (dados fictícios/embaralhados). Precisam estar no diretório de execução.
- `README-CANDIDATO.md`, `curl-examples.md` — material entregue ao candidato.
- `Dockerfile`, `docker-compose.yml` — imagem multi-stage `node:20-alpine`.

Não existem: CI (`.github/`), configuração do ESLint, configuração do Jest, `package-lock.json`, `.nvmrc`.

## 3. Como rodar

Runtime: Node 20 (o `Dockerfile` usa `node:20-alpine`; o README diz "20+"). Não há versão fixada no repo.
Conferido com Node 20.20.2 via mise.

```bash
mise exec node@20 -- npm install          # ~20 s; gera package-lock.json (não versionado, não commitar)
mise exec node@20 -- npm run build        # tsc -> dist/, < 1 s
mise exec node@20 -- npm run dev          # tsx watch src/index.ts (não conferido em modo watch)
```

Rodar local sem esperar atraso nem erros aleatórios (conferido; responde em ms):

```bash
npm run build
PORT=39006 MIN_DELAY=0 MAX_DELAY=0 ERROR_CHANCE_PERCENT=0 node dist/index.js
curl -s localhost:39006/health
```

Variáveis (só nomes; todas opcionais, defaults em `src/config/config.ts`; modelo em `.env.example`):
`PORT`, `NODE_ENV`, `JWT_SECRET`, `TOKEN_EXPIRY`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`,
`LOG_LEVEL`, `LOG_DIR`, `MIN_DELAY`, `MAX_DELAY`, `ERROR_CHANCE_PERCENT`.
`ERROR_CHANCE_PERCENT` (padrão 15) e `LOG_DIR` não aparecem na tabela do README.

Docker: `docker compose config -q` valida (só aviso de `version` obsoleto). `docker compose up` **não foi
conferido** e hoje deve falhar/ficar inacessível — ver Armadilhas.

## 4. Como testar

Não há CI. Nenhum comando abaixo é exigido automaticamente em PR.

```bash
npm run typecheck   # tsc --noEmit — passa, < 1 s
npm run build       # passa, < 1 s
npm test            # FALHA hoje: 4 suítes, 0 testes (sem config do Jest/ts-jest)
npm run lint        # FALHA hoje: ESLint 8 sem arquivo de configuração
```

Para executar os testes de verdade sem alterar o repo (conferido, ~2,5 s):

```bash
npx jest --preset ts-jest --testEnvironment node \
  --setupFilesAfterEnv ./src/__tests__/setup.ts \
  --testPathIgnorePatterns setup.ts dist
```

Resultado atual: 12 testes, 11 passam, 1 falha preexistente
(`AuthService › validateToken › should reject an expired token`, ver Armadilhas).
Rode `rm -rf dist` antes, ou mantenha `dist` no `--testPathIgnorePatterns`: o `tsc` compila
`src/__tests__/setup.ts` para `dist/__tests__/`.

Um teste só (conferido): ponha o arquivo **antes** das flags (depois de `--testPathIgnorePatterns`
ele vira padrão de exclusão) ou use `-t "<nome do teste>"`:

```bash
npx jest src/__tests__/middleware/authMiddleware.test.ts --preset ts-jest --testEnvironment node \
  --setupFilesAfterEnv ./src/__tests__/setup.ts --testPathIgnorePatterns setup.ts dist
```

Antes de entregar uma mudança: `npm run typecheck`, `npm run build` e o comando Jest acima sem
novas falhas. Teste manual com o servidor local (seção 3) e `curl` quando mexer em rotas.

## 5. Convenções

- TypeScript `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. Parâmetro não usado: prefixo `_` (`_req`).
- Camadas: rota -> middleware (validação/auth) -> controller (HTTP) -> service (regra). Cada controller/service é uma classe exportada também como singleton (`export const authService = new AuthService()`).
- Erros de negócio: lançar `Error` com `status` e `code`; o controller responde `{ error, message, code }` com esse status.
- Logs com `logger` (Winston), nunca `console.log`. Mascarar documento ao logar (o `reportService` usa `substring(...) + '***'`).
- Mensagens ao cliente misturam português (auth) e inglês (relatórios); preserve o texto existente, os candidatos dependem dele.
- Testes: Jest em `src/__tests__/<camada>/<arquivo>.test.ts`, objetos `Request`/`Response` parciais com `jest.fn()`, `jest.mock('../../services/...')` para isolar camadas. `supertest` está instalado mas não é usado.
- Commits: mensagens curtas em português, sem prefixo (ex.: "Melhorias"). Para novos commits prefira `tipo: descrição` em português. Branch padrão: `master`. Sem template de PR.

## 6. Integrações externas

Nenhuma. O serviço não chama APIs, bancos, filas, buckets ou Secrets Manager. É ele o "serviço
externo" falso para os candidatos. Estado é só memória (tokens) e os dois JSON do disco.

## 7. Regras e limites

- Não commitar `package-lock.json`, `dist/`, `logs/`, `.env` nem `node_modules/` sem pedido explícito (o lockfile não é versionado hoje; adicioná-lo é decisão humana).
- Não colocar dados reais em `payload-*.json`: só dados fictícios. Não copiar números de documento desses arquivos para docs, commits ou PRs.
- Mudar formato de resposta, rotas, códigos de status, nomes de header ou `reportName` quebra o desafio dos candidatos e o `validate-challenge.sh` (que não está versionado): exige confirmação humana.
- Não alterar `README-CANDIDATO.md` sem pedido: é material enviado a candidatos.
- Não há deploy no repo. Não publicar imagem nem subir o mock em ambiente compartilhado sem pedido.
- Não colocar valor de `JWT_SECRET` em arquivo versionado.

## 8. Armadilhas conhecidas

- `npm test` não roda nada: não há `jest.config.js` (o README cita um que não existe) nem preset `ts-jest`, então o Babel falha no TypeScript. Use o comando da seção 4.
- `npm run lint` falha: não há `.eslintrc*`. Plugins `@typescript-eslint` v6 estão instalados.
- Teste de token expirado falha: ele muda `process.env.TOKEN_EXPIRY` depois do import, mas `config` já foi lido no import. Para testar expiração, controle o tempo (`jest.useFakeTimers`/`Date.now`) ou injete config.
- `Dockerfile` usa `npm ci`, que exige `package-lock.json`; o lockfile não está versionado, então o build da imagem deve falhar (conferido: `npm ci` sem lockfile falha; `docker build` não executado).
- `docker-compose.yml` publica `3009:3009` mas o app escuta em `PORT=3006`: a porta do host não alcança o app. README e candidatos esperam `localhost:3006`.
- O README manda `cp .env.example .env`; o arquivo só passa a existir com este PR.
- `curl-examples.md` cita `test-curls.sh`, `test-rate-limit*.sh`; `README-CANDIDATO.md` cita `validate-challenge.sh`. Nenhum está versionado.
- `requestLogger` loga todos os headers (inclui `Authorization` e `X-Document-id` completos) e o body, contradizendo o mascaramento feito no `reportService`.
- Rate limit é global e conta `/health`: 100 req por 15 min por IP com os defaults. Scripts de validação em loop recebem 429.
- `tsc` emite `dist/__tests__/setup.js` porque o `exclude` só pega `*.test.ts`.
- Tokens vivem em memória: reiniciar o processo invalida todos.

## 9. Fatos do sistema real

- Login: `POST /security/iam/v1/client-identities/login` aceita **qualquer** `Authorization: Basic <algo>`; não confere usuário/senha. Resposta: `{ accessToken, tokenType: "Bearer", expiresIn: "3600", scope: ["read","write"] }` — `expiresIn` é **string**.
- O token é base64 de `{ payload: { clientId, timestamp, expiryTimestamp }, hash }`, não é JWT (apesar do nome `JWT_SECRET`). Só vale se estiver no `Map` do processo.
- PF: `GET /credit-services/person-information-report/v1/creditreport?reportName=RELATORIO_BASICO_PF_PME`; PJ: `GET /credit-services/business-information-report/v1/reports?reportName=RELATORIO_BASICO_PJ_PME`. Ambos exigem `Authorization: Bearer` e `X-Document-id`. Não há validação de formato de CPF/CNPJ (qualquer string).
- Erros de validação: 400 `{ "error": "<mensagem Joi>" }`. Sem/mau token: 401 com `error` em português. Rota inexistente: 404 `{ error, path }`. Rate limit: 429 com `retryAfter` em segundos.
- Erro aleatório (padrão 15%) é sorteado **antes** do atraso, então volta rápido: 400, 401 `TOKEN_EXPIRED` (mesmo com token válido), 403, 429, 500 ou 503, corpo `{ error: "Failed to generate report", message, code }`.
- Sucesso demora entre `MIN_DELAY` e `MAX_DELAY` ms (padrão 2 s a 60 s). Clientes precisam de timeout acima de 60 s.
- Resposta de sucesso é o payload inteiro (`{ reports: [ ... ] }`). PF: sobrescreve `reports[0].registration.documentNumber` com o documento pedido. PJ: grava em `reports[0].registration.documentId` (campo novo); `companyDocument` continua o valor fixo do arquivo.
- `/health` sempre responde 200 `status: "healthy"`, mesmo com payload ausente; veja `payloads.pf/pj`. Sem payload, os relatórios dão 500 `PF payload not available`.
