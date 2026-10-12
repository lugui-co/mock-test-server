# AGENTS.md — mock-test-server (Mock Serasa Server)

Instruções para agentes de IA. Tudo aqui foi conferido em 2026-10-11 contra o código e rodando os
comandos (fase 2 de AI readiness, branch `docs/ai-readiness`); o que não foi conferido está marcado.

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
- `src/__tests__/` — testes Jest (`<camada>/*.test.ts`), `env.ts` (env fictícia, roda antes dos imports) e `setup.ts` (silencia o logger, restaura mocks).
- `payload-pf.json`, `payload-pj.json` — respostas fixas com dados **sintéticos** (CPF/CNPJ gerados, nomes fictícios). Precisam estar no diretório de execução.
- `README-CANDIDATO.md`, `curl-examples.md` — material entregue ao candidato.
- `Dockerfile`, `docker-compose.yml` — imagem multi-stage `node:20-alpine`, porta 3006.
- `jest.config.js`, `.eslintrc.cjs`, `tsconfig.json` (typecheck, inclui testes), `tsconfig.build.json` (build, exclui testes).
- `.github/workflows/ci.yml` — CI em PR e push na `master`.
- `docs/architecture.md` — fluxo e decisões; `docs/ai-readiness.md` — avaliação.

## 3. Como rodar

Runtime: Node 20 (`.nvmrc`, `engines`, `packageManager: npm@10.8.2`; o `Dockerfile` usa `node:20-alpine`).
Conferido com Node 20.20.2 via mise. Lockfile `package-lock.json` versionado.

```bash
mise exec node@20 -- npm ci               # ~45 s sem cache
npm run build                             # tsc -p tsconfig.build.json -> dist/, ~1 s
npm run dev                               # tsx watch src/index.ts (não conferido em modo watch)
```

Rodar local sem esperar atraso nem erros aleatórios (conferido; responde em ms):

```bash
npm run build
PORT=39006 MIN_DELAY=0 MAX_DELAY=0 ERROR_CHANCE_PERCENT=0 node dist/index.js
curl -s localhost:39006/health
```

Variáveis (só nomes; todas opcionais, defaults em `src/config/config.ts`; modelo comentado em `.env.example`):
`PORT`, `NODE_ENV`, `JWT_SECRET`, `TOKEN_EXPIRY`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`,
`LOG_LEVEL`, `LOG_DIR`, `MIN_DELAY`, `MAX_DELAY`, `ERROR_CHANCE_PERCENT`.

Docker (conferido): `docker build -t mock-serasa .` (~70 s) e
`docker run -p 3006:3006 -e MIN_DELAY=0 -e MAX_DELAY=0 -e ERROR_CHANCE_PERCENT=0 mock-serasa` respondem em
`localhost:3006/health`. `docker compose up` publica `3006:3006` (não executado; `docker compose config -q` ok).

## 4. Como testar

O CI (`.github/workflows/ci.yml`) roda em todo PR exatamente isto, nesta ordem; rode antes de entregar:

```bash
npm ci
npm run typecheck   # tsc --noEmit (src + testes), ~1 s
npm run lint        # ESLint, --max-warnings 12 (baseline de `any`), ~1 s
npm run test:ci     # jest --ci --coverage, 40 testes, ~2 s, limites em jest.config.js
npm run build       # ~1 s
```

E um job `docker` constrói a imagem e faz smoke test em `/health`.

Um arquivo ou um teste: `npx jest src/__tests__/routes/routes.test.ts` ou `npx jest -t "<nome>"`.

Os testes não dependem de `.env`, fuso, rede ou sorte: `src/__tests__/env.ts` fixa `TZ=UTC`,
`MIN_DELAY=MAX_DELAY=0`, `ERROR_CHANCE_PERCENT=0` e um `JWT_SECRET` fictício antes de qualquer import.
Para testar erro aleatório, faça `jest.spyOn` em `shouldGenerateRandomError` e `Math.random`
(ver `reportService.test.ts`). Para expiração, `jest.spyOn(Date, 'now')`.
Rotas: `routes.test.ts` monta o mesmo encadeamento de `src/index.ts` (sem rate limit nem `listen`) e usa `supertest`.

Novo `any` faz o lint falhar (passa de 12 warnings): tipifique. Cobertura abaixo dos limites faz `test:ci` falhar.

## 5. Convenções

- TypeScript `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. Parâmetro não usado: prefixo `_` (`_req`).
- Camadas: rota -> middleware (validação/auth) -> controller (HTTP) -> service (regra). Cada controller/service é uma classe exportada também como singleton (`export const authService = new AuthService()`).
- Erros de negócio: lançar `Error` com `status` e `code`; o controller responde `{ error, message, code }` com esse status.
- Logs com `logger` (Winston), nunca `console.log`. Mascarar documento ao logar (o `reportService` usa `substring(...) + '***'`).
- Mensagens ao cliente misturam português (auth) e inglês (relatórios); preserve o texto existente, os candidatos dependem dele.
- Testes: Jest em `src/__tests__/<camada>/<arquivo>.test.ts`, objetos `Request`/`Response` parciais com `jest.fn()`, `jest.mock('../../services/...')` para isolar camadas; integração HTTP com `supertest`. Serviços exportam a classe (`new ReportService()`) além do singleton. Documentos em teste: só sintéticos.
- Commits: `tipo: descrição` em português (`ci:`, `test:`, `fix:`, `chore:`, `docs:`); os commits antigos não tinham prefixo. Branch padrão: `master`. Sem template de PR.

## 6. Integrações externas

Nenhuma. O serviço não chama APIs, bancos, filas, buckets ou Secrets Manager. É ele o "serviço
externo" falso para os candidatos. Estado é só memória (tokens) e os dois JSON do disco.

## 7. Dados reais (dev/prod)

- Bancos Postgres da Lugui (`gestao`, `luguiapi`, `contracts`, `scheduler`): use o `lugui-db` (repo privado `lugui-co/lugui-db`;
  instale com `uv tool install git+ssh://git@github.com/lugui-co/lugui-db.git && lugui-db instalar`, que também instala a skill
  `lugui-dados` com o mapa dos bancos). `lugui-db bancos` mostra o que existe; leitura: `lugui-db dev <banco> "SELECT ..."`
  (transação somente leitura garantida pelo banco).
- Escrita só com `lugui-db ... --write --motivo "..."` (dev aplica; prod espera o ok do dono). Nunca monte túnel, Lambda de SQL ou `psql` à mão.
- DynamoDB, logs e filas: AWS CLI só leitura, com `--profile dev|prod` explícito.
- Dado de cliente (CPF, nome, telefone, e-mail, chave Pix) pode ser lido para analisar, mas nunca vai para arquivo, commit, PR ou issue.
- Este repo não tem banco próprio (mock em memória para o desafio de candidatos): a seção vale para investigar dados dos
  serviços reais da Lugui; nada lido lá entra nos `payload-*.json` daqui.

## 8. Regras e limites

- `package-lock.json` é versionado: mudou dependência, rode `npm install` e commite o lockfile junto. Não commitar `dist/`, `logs/`, `.env`, `coverage/` nem `node_modules/`.
- Não colocar dados reais em `payload-*.json`: só sintéticos (CPF/CNPJ gerados com dígito válido, nomes fictícios). Não copiar números de documento para docs, commits ou PRs.
- Mudar formato de resposta, rotas, códigos de status, nomes de header ou `reportName` quebra o desafio dos candidatos e o `validate-challenge.sh` (que não está versionado): exige confirmação humana.
- Não alterar `README-CANDIDATO.md` sem pedido: é material enviado a candidatos.
- Não há deploy no repo. Não publicar imagem nem subir o mock em ambiente compartilhado sem pedido.
- Não colocar valor de `JWT_SECRET` em arquivo versionado.
- Não logar `Authorization`, documento completo nem body: use `sanitizeHeaders` (`requestLogger`).

## 9. Armadilhas conhecidas

- `config` é lido **uma vez, no import**: mudar `process.env` dentro de um teste não tem efeito. Fixe env em `src/__tests__/env.ts` ou controle tempo/aleatoriedade com `jest.spyOn`.
- `curl-examples.md` cita `test-curls.sh`, `test-rate-limit*.sh`; `README-CANDIDATO.md` cita `validate-challenge.sh`. Nenhum está versionado.
- Rate limit é global e conta `/health`: 100 req por 15 min por IP com os defaults. Scripts de validação em loop recebem 429.
- Tokens vivem em memória: reiniciar o processo invalida todos.
- `docker-compose.yml` ainda tem `version: '3.8'` (aviso de obsoleto, inofensivo).
- `src/index.ts` não exporta o `app` (monta e dá `listen` no import); por isso o teste de rotas remonta o encadeamento. Se mudar middlewares em `index.ts`, atualize `routes.test.ts`.

## 10. Fatos do sistema real

- Login: `POST /security/iam/v1/client-identities/login` aceita **qualquer** `Authorization: Basic <algo>`; não confere usuário/senha. Resposta: `{ accessToken, tokenType: "Bearer", expiresIn: "3600", scope: ["read","write"] }` — `expiresIn` é **string**.
- O token é base64 de `{ payload: { clientId, timestamp, expiryTimestamp }, hash }`, não é JWT (apesar do nome `JWT_SECRET`). Só vale se estiver no `Map` do processo.
- PF: `GET /credit-services/person-information-report/v1/creditreport?reportName=RELATORIO_BASICO_PF_PME`; PJ: `GET /credit-services/business-information-report/v1/reports?reportName=RELATORIO_BASICO_PJ_PME`. Ambos exigem `Authorization: Bearer` e `X-Document-id`. Não há validação de formato de CPF/CNPJ (qualquer string).
- Erros de validação: 400 `{ "error": "<mensagem Joi>" }`. Sem/mau token: 401 com `error` em português. Rota inexistente: 404 `{ error, path }`. Rate limit: 429 com `retryAfter` em segundos.
- Erro aleatório (padrão 15%) é sorteado **antes** do atraso, então volta rápido: 400, 401 `TOKEN_EXPIRED` (mesmo com token válido), 403, 429, 500 ou 503, corpo `{ error: "Failed to generate report", message, code }`.
- Sucesso demora entre `MIN_DELAY` e `MAX_DELAY` ms (padrão 2 s a 60 s). Clientes precisam de timeout acima de 60 s.
- Resposta de sucesso é o payload inteiro (`{ reports: [ ... ] }`). PF: sobrescreve `reports[0].registration.documentNumber` com o documento pedido. PJ: grava em `reports[0].registration.documentId` (campo novo); `companyDocument` continua o valor fixo do arquivo.
- `/health` sempre responde 200 `status: "healthy"`, mesmo com payload ausente; veja `payloads.pf/pj`. Sem payload, os relatórios dão 500 `PF payload not available`.
