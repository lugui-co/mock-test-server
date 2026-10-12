# Mock Serasa Server

Servidor mock modernizado para simular a API Serasa com TypeScript e melhores práticas.

## Recursos

- ✅ TypeScript com tipagem completa
- ✅ Arquitetura modular e escalável
- ✅ Docker e Docker Compose
- ✅ Token Bearer assinado com HMAC SHA-256 (não é JWT)
- ✅ Logging estruturado com Winston
- ✅ Validação de requisições com Joi
- ✅ Testes unitários e de integração (Jest + supertest) e CI em PR
- ✅ Middlewares de segurança (Helmet, CORS)
- ✅ Compressão de respostas
- ✅ Health check endpoint
- ✅ Limpeza automática de tokens expirados

## Pré-requisitos

- Node.js 20 (versão em `.nvmrc`; o Docker usa `node:20-alpine`)
- Docker e Docker Compose (para produção)
- Arquivos `payload-pf.json` e `payload-pj.json` no diretório raiz

## Instalação

### Desenvolvimento

```bash
# Instalar dependências (lockfile versionado)
npm ci

# Copiar arquivo de configuração
cp .env.example .env

# Executar em modo desenvolvimento
npm run dev

# Sem atraso nem erros aleatórios (respostas em ms)
MIN_DELAY=0 MAX_DELAY=0 ERROR_CHANCE_PERCENT=0 npm run dev
```

### Produção com Docker

```bash
# Construir e executar com Docker Compose
docker compose up -d   # http://localhost:3006

# Ver logs
docker compose logs -f

# Parar servidor
docker compose down
```

## Scripts Disponíveis

- `npm run dev` - Executa em modo desenvolvimento com hot reload
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Executa servidor compilado
- `npm test` - Executa os testes (Jest + ts-jest, env fictícia em `src/__tests__/env.ts`)
- `npm run test:coverage` - Executa testes com cobertura
- `npm run test:ci` - Testes com cobertura e limites mínimos (usado no CI)
- `npm run lint` - Verifica código com ESLint (`.eslintrc.cjs`)
- `npm run typecheck` - Verifica tipos TypeScript

## Endpoints

### Autenticação
```
POST /security/iam/v1/client-identities/login
Headers: Authorization: Basic <base64>
```

### Relatório PF
```
GET /credit-services/person-information-report/v1/creditreport?reportName=RELATORIO_BASICO_PF_PME
Headers: 
  - Authorization: Bearer <token>
  - X-Document-id: <cpf>
```

### Relatório PJ
```
GET /credit-services/business-information-report/v1/reports?reportName=RELATORIO_BASICO_PJ_PME
Headers:
  - Authorization: Bearer <token>
  - X-Document-id: <cnpj>
```

### Health Check
```
GET /health
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| PORT | Porta do servidor | 3006 |
| NODE_ENV | Ambiente (development/production) | development |
| JWT_SECRET | Chave HMAC dos tokens | default-secret-key |
| TOKEN_EXPIRY | Tempo de expiração do token (segundos) | 3600 |
| RATE_LIMIT_WINDOW_MS | Janela para rate limiting (ms) | 900000 |
| RATE_LIMIT_MAX_REQUESTS | Máximo de requisições por janela | 100 |
| LOG_LEVEL | Nível de log | info |
| MIN_DELAY | Delay mínimo de resposta (ms) | 2000 |
| MAX_DELAY | Delay máximo de resposta (ms) | 60000 |
| ERROR_CHANCE_PERCENT | Chance (%) de erro aleatório nos relatórios | 15 |
| LOG_DIR | Diretório dos logs em arquivo (só `NODE_ENV=production`) | logs |

## Estrutura do Projeto

```
.
├── src/
│   ├── config/          # Configurações
│   ├── controllers/     # Controladores
│   ├── middleware/      # Middlewares
│   ├── routes/          # Rotas
│   ├── services/        # Serviços de negócio
│   ├── types/           # Tipos TypeScript
│   ├── utils/           # Utilitários
│   └── index.ts         # Entry point
├── Dockerfile           # Imagem Docker
├── docker-compose.yml   # Orquestração Docker
├── package.json         # Dependências
├── tsconfig.json        # TypeScript (typecheck, inclui testes)
├── tsconfig.build.json  # Build (exclui testes)
├── jest.config.js       # Configuração Jest
├── .eslintrc.cjs        # Configuração ESLint
└── .github/workflows/ci.yml  # CI: typecheck, lint, testes, build, imagem Docker
```

## Segurança

- Tokens assinados com HMAC SHA-256, guardados em memória
- Rate limiting para prevenir abuso
- Helmet para headers de segurança
- Validação de entrada com Joi
- Usuário não-root no Docker
- Secrets através de variáveis de ambiente

## Monitoramento

- Health check endpoint com status dos payloads
- Logging estruturado com níveis configuráveis
- Contagem de tokens ativos
- Métricas de tempo de resposta nos logs

## Arquitetura

Ver [`docs/architecture.md`](docs/architecture.md).
