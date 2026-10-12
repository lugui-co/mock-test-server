# Avaliação de AI readiness — mock-test-server

Data: 2026-10-11. Base: `master` @ `807a53b`. Runtime usado: Node 20.20.2 (mise), npm 10.
Notas: 0 ausente, 1 fraco, 2 ok, 3 exemplar.

| # | Dimensão | Nota | Evidência |
|---|----------|------|-----------|
| 1 | Instruções para agentes | 2 | Não havia AGENTS.md/CLAUDE.md; o AGENTS.md novo entra neste mesmo PR, com comandos conferidos, mas descreve vários comandos quebrados em vez de comandos que simplesmente funcionam. |
| 2 | Setup reproduzível | 1 | `npm install` funciona, mas não há lockfile versionado nem `.nvmrc`/`engines`; o `Dockerfile` usa `npm ci` (exige lockfile) e o README manda copiar um `.env.example` que não existia. |
| 3 | Testes | 1 | 12 testes unitários só de auth (nada de `reportService`, rotas ou validação); `npm test` roda 0 testes por falta de config do Jest; com `ts-jest` ad hoc 11/12 passam em ~2,5 s. |
| 4 | Rodar sem serviços reais | 3 | Não há dependência externa; com `MIN_DELAY=0 MAX_DELAY=0 ERROR_CHANCE_PERCENT=0` o servidor sobe local e responde em ms. |
| 5 | Lint, format e tipos | 1 | `tsc --noEmit` passa com `strict`; `npm run lint` falha (sem config ESLint); não há Prettier nem hook. |
| 6 | CI em PR | 0 | Não existe `.github/workflows`; nada barra PR quebrado. |
| 7 | Variáveis e segredos | 2 | Config centralizada em `config.ts` com defaults e README com tabela (faltavam `ERROR_CHANCE_PERCENT` e `LOG_DIR`); sem segredo real no repo; `.env.example` adicionado neste PR. |
| 8 | Tamanho e clareza dos módulos | 3 | ~800 linhas em arquivos de até 155 linhas, camadas rota/middleware/controller/service claras; ponto fraco: `any` e duplicação PF/PJ em `reportService`/`reportController`. |
| 9 | Arquitetura e decisões | 1 | README lista estrutura e endpoints, mas cita `jest.config.js` e scripts inexistentes; não há ADR nem explicação de por que existem atraso e erros aleatórios. |
| 10 | Segurança para agentes | 2 | Não há deploy, migração nem script destrutivo no repo; riscos: `requestLogger` loga `Authorization` e documento completos, e os payloads contêm números de documento cuja natureza fictícia não está documentada. |

**Total: 16/30**

## 5 ações de maior impacto

1. **Fazer `npm test` e `npm run lint` funcionarem (P)** — adicionar `jest.config.js` com preset `ts-jest`/`roots: ['src']`/`setupFilesAfterEnv` e um `.eslintrc` para `@typescript-eslint`; hoje um agente não tem como saber se quebrou algo com os scripts declarados.
2. **Criar CI em PR (P)** — workflow com `npm ci`, `typecheck`, `lint`, `test`, `build` em Node 20 (pode reaproveitar `lugui-co/infra-github-pipelines`); hoje nada impede merge quebrado.
3. **Versionar `package-lock.json` e fixar Node (P)** — destrava o `npm ci` do `Dockerfile` e torna o setup reproduzível (`.nvmrc` ou `engines`).
4. **Corrigir o `docker-compose.yml` e testes de integração das rotas (M)** — mapear `3006:3006` (hoje `3009:3009` com app em 3006) e usar o `supertest` já instalado para cobrir login -> relatório, 400/401/404, com `ERROR_CHANCE_PERCENT=0` e atrasos 0; consertar o teste de token expirado (config lida no import).
5. **Parar de logar credencial e documento no `requestLogger` (P)** — mascarar `Authorization`/`X-Document-id` e não logar body; e documentar que os payloads são fictícios (ou substituir os números de documento por valores sabidamente sintéticos).

## Falhas preexistentes encontradas

| Comando | Tempo | Resultado |
|---------|-------|-----------|
| `mise exec node@20 -- npm install` | ~21 s | OK (warnings de pacotes deprecados; gera `package-lock.json` não versionado) |
| `npm run build` | ~0,8 s | OK (emite também `dist/__tests__/setup.js`) |
| `npm run typecheck` | < 1 s | OK |
| `npm run lint` | < 1 s | **Falha**: ESLint não encontra arquivo de configuração |
| `npm test` | ~0,8 s | **Falha**: 4 suítes com `SyntaxError` (Jest sem `ts-jest`), 0 testes executados |
| `npx jest --preset ts-jest --testEnvironment node --setupFilesAfterEnv ./src/__tests__/setup.ts --testPathIgnorePatterns setup.ts dist` | ~2,5 s | 11/12; **falha** `AuthService › validateToken › should reject an expired token` (altera `TOKEN_EXPIRY` depois que `config` já foi lido) |
| `node dist/index.js` com `PORT`, `MIN_DELAY=0`, `MAX_DELAY=0`, `ERROR_CHANCE_PERCENT=0` + `curl` | — | OK: `/health` 200, login -> relatório PF 200, `reportName` inválido 400, rota inexistente 404 |
| `docker compose config -q` | — | OK (aviso: `version` obsoleto) |
| `npm ci` sem lockfile (simula o `Dockerfile`) | — | **Falha**: `npm ci` exige `package-lock.json`; `docker build` não executado |

Outros problemas vistos na leitura: porta `3009:3009` no compose com app em 3006; README cita `.env.example` e `jest.config.js` inexistentes; `curl-examples.md` e `README-CANDIDATO.md` citam scripts (`test-curls.sh`, `validate-challenge.sh` etc.) que não estão versionados.
