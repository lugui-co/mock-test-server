# Avaliação de AI readiness — mock-test-server

Fase 1: 2026-10-11, `master` @ `807a53b` (só docs). Fase 2: 2026-10-11, mesma base (a `master` não
avançou), melhorias implementadas na branch `docs/ai-readiness`. Runtime: Node 20.20.2 (mise), npm 10.8.2.
Notas: 0 ausente, 1 fraco, 2 ok, 3 exemplar.

| # | Dimensão | Nota antes (fase 1) | Nota agora | Evidência |
|---|----------|:---:|:---:|-----------|
| 1 | Instruções para agentes | 2 | 3 | `AGENTS.md` (+ `CLAUDE.md` -> `@AGENTS.md`) só com comandos que funcionam e foram rodados; mesma sequência do CI; armadilhas e contrato com candidatos; `docs/architecture.md`. |
| 2 | Setup reproduzível | 1 | 3 | `package-lock.json` versionado, `.nvmrc` (20), `engines`, `packageManager: npm@10.8.2`; `npm ci` funciona; `docker build` e container respondendo em `/health` conferidos; compose publica `3006:3006`. |
| 3 | Testes | 1 | 3 | `npm test` roda 40 testes (eram 0) em ~2 s: unitários de auth, report service, middlewares e integração das rotas com `supertest`; env fixa em `src/__tests__/env.ts` (TZ, sem atraso/erro aleatório, segredo fictício); teste de token expirado corrigido; cobertura 94% linhas com limites em `jest.config.js`. |
| 4 | Rodar sem serviços reais | 3 | 3 | Nenhuma dependência externa; modo rápido `MIN_DELAY=0 MAX_DELAY=0 ERROR_CHANCE_PERCENT=0` documentado no README e no `.env.example`. |
| 5 | Lint, format e tipos | 1 | 2 | `.eslintrc.cjs` (`@typescript-eslint/recommended`); `npm run lint` passa com 12 warnings de `any` (baseline, `--max-warnings 12`); `tsc --noEmit` `strict` agora cobre também os testes. Falta Prettier/hook e zerar os `any`. |
| 6 | CI em PR | 0 | 2 | `.github/workflows/ci.yml`: `npm ci`, typecheck, lint, `test:ci`, build e build+smoke da imagem Docker; sem segredos, `permissions: contents: read`; actionlint ok; job `test` rodado localmente com `act` (sucesso); os dois jobs verdes no PR #1 no GitHub Actions. Para 3: check obrigatório na `master` (configuração humana). |
| 7 | Variáveis e segredos | 2 | 3 | `.env.example` com as 11 variáveis lidas em `config.ts`, vazias e comentadas com default; tabela do README completa (`ERROR_CHANCE_PERCENT`, `LOG_DIR`); nenhum segredo real versionado. |
| 8 | Tamanho e clareza dos módulos | 3 | 3 | Arquivos de até ~155 linhas, camadas claras. Pontos fracos registrados: `any` e duplicação PF/PJ em `reportService`/`reportController`. |
| 9 | Arquitetura e decisões | 1 | 2 | `docs/architecture.md` explica fluxo, por que existem atraso/erros aleatórios e decisões (token não é JWT, estado em memória, config no import); README corrigido. Sem ADRs; `curl-examples.md`/`README-CANDIDATO.md` ainda citam scripts não versionados. |
| 10 | Segurança para agentes | 2 | 3 | `requestLogger` mascara `Authorization`/`X-Document-id`/cookie e não loga body (com teste); payloads com CPF/CNPJ sintéticos e nomes/telefones fictícios; sem deploy nem script destrutivo; CI sem credenciais. Resta: dados antigos no histórico do git (ação humana). |

**Total: 16/30 -> 27/30**

## 5 ações de maior impacto (o que ainda falta)

1. **Tornar o CI obrigatório (humano, P)** — em Settings > Branches (ou Rulesets) da `master`: exigir PR,
   exigir os checks `typecheck, lint, test, build` e `docker build` do workflow `CI`, bloquear force-push.
2. **Avaliar o histórico dos payloads (humano, P)** — os commits antigos de `payload-pj.json`/`payload-pf.json`
   têm CNPJ/CPF válidos, razões sociais e nome de pessoa que pareciam reais. Decidir se é necessário
   reescrever o histórico (fora do escopo de agente) ou aceitar o risco.
3. **Zerar os 12 `any` (M)** — tipar payloads e erros em `reportService`/`reportController`/`requestLogger`
   e baixar `--max-warnings` para 0; aproveitar para remover a duplicação PF/PJ.
4. **Exportar o `app` de `src/index.ts` (P)** — separar montagem (`app.ts`) de `listen`, para o teste de
   rotas usar o mesmo app (hoje remonta o encadeamento). Não feito agora porque há mudança não commitada
   em `src/index.ts` na cópia local do mantenedor.
5. **Prettier + versionar os scripts citados (P)** — adicionar Prettier sem reformatar em massa e versionar
   (ou remover as menções a) `validate-challenge.sh`, `test-curls.sh`, `test-rate-limit*.sh`.

## Falhas preexistentes

| Comando | Fase 1 | Agora |
|---------|--------|-------|
| `npm ci` | **Falha** (sem lockfile) | OK, ~45 s sem cache |
| `npm run typecheck` | OK (sem testes) | OK, ~1 s, inclui testes |
| `npm run lint` | **Falha** (sem config) | OK, ~1 s, 0 erros, 12 warnings (baseline) |
| `npm test` | **Falha**: 0 testes (sem ts-jest) | OK: 40/40, ~2 s |
| `npm run test:ci` | — | OK, cobertura stmts 94,5% / branches 66% / funcs 97% / lines 94% (limites 90/60/90/90) |
| `npm run build` | OK, emitia `dist/__tests__` | OK, ~1 s, sem testes em `dist/` |
| Teste `should reject an expired token` | **Falha** (env alterada após import) | Corrigido (controla `Date.now`) |
| `docker build .` | **Falha** esperada (`npm ci` sem lockfile) | OK, ~70 s; container responde `/health` |
| `docker compose` porta | `3009:3009` com app em 3006 | `3006:3006` |
| `actionlint` | — (sem CI) | OK |
| `act pull_request -j test` | — | Job succeeded |

Metas de cobertura: limites atuais em `jest.config.js` (90/60/90/90) = valor medido arredondado para baixo.
Meta sugerida: branches 80% (faltam ramos de `config.ts`, `logger.ts` e `reportController`).

Restou: `version` obsoleto no compose (aviso), scripts citados não versionados, `any`/duplicação PF/PJ.
