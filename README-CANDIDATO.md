# 🚀 Desafio Técnico - Integração com API Serasa

## Bem-vindo(a) ao Desafio!

Você foi selecionado(a) para nosso desafio técnico. Sua missão é criar um **microserviço de consulta de crédito** que integra com uma API externa (Serasa). Para facilitar o desenvolvimento, fornecemos um **mock server** que simula o comportamento real da API Serasa.

---

## 📋 O que você precisa fazer

### 1. Criar uma API REST que:

- **Conecte com nosso mock server** (porta 3006)
- **Exponha endpoints simplificados** para consulta de CPF e CNPJ
- **Rode na porta 3000**
- **Implemente cache** para otimizar consultas
- **Trate erros adequadamente**

### 2. Endpoints Obrigatórios da sua API:

```
GET /api/v1/consulta/cpf/{cpf}
GET /api/v1/consulta/cnpj/{cnpj}  
GET /api/v1/health
```

### 3. Fluxo Esperado:

1. Sua API recebe uma requisição de consulta
2. Valida o CPF/CNPJ recebido
3. Autentica com o mock server Serasa
4. Consulta os dados no mock
5. Retorna os dados formatados ao cliente

---

## 🎯 Requisitos Obrigatórios

### ✅ Funcionalidades Básicas
- [ ] Validação de CPF (11 dígitos) e CNPJ (14 dígitos)
- [ ] Integração completa com mock Serasa
- [ ] Gerenciamento de token de autenticação
- [ ] Tratamento de erros com mensagens apropriadas
- [ ] Health check endpoint

### ✅ Requisitos Técnicos
- [ ] Aplicação deve rodar na **porta 3000**
- [ ] Dockerfile funcional
- [ ] Docker Compose (sua app + mock)
- [ ] Configuração via variáveis de ambiente
- [ ] README com instruções de execução
- [ ] **Testes automatizados** (unitários e integração)

### ✅ Tratamento de Erros
- [ ] CPF/CNPJ inválido → HTTP 400
- [ ] Documento não encontrado → HTTP 404  
- [ ] Erro no mock → HTTP 503
- [ ] Token expirado → Renovar automaticamente

---

## 🌟 Diferenciais (Não obrigatórios, mas impressionam!)

### Cache Inteligente
- Implementar cache de consultas
- TTL configurável (sugestão: 5 minutos)
- Header indicando hit/miss do cache

### Rate Limiting
- Implementar rate limiting próprio
- Headers X-RateLimit-*
- Proteção contra abuso

### Observabilidade
- Logs estruturados (JSON)
- Correlation ID para rastreamento
- Métricas de performance
- Endpoint `/metrics`

### Resilência
- Retry automático com backoff
- Circuit breaker
- Timeout configurável

### Extras que adoramos ver
- Documentação OpenAPI/Swagger
- Validação de dígitos verificadores CPF/CNPJ
- Autenticação na sua API
- Circuit breaker e retry com backoff
- CI/CD pipeline

---

## 🔧 Como começar

### 1. Setup do Mock Server

```bash
# Clone este repositório
git clone [este-repositorio]

# Entre na pasta
cd mock-serasa

# Suba o mock server
docker-compose up -d

# Verifique se está funcionando
curl http://localhost:3006/health
```

### 2. Mock Server - Endpoints Disponíveis

#### Autenticação (obter token)
```bash
POST http://localhost:3006/security/iam/v1/client-identities/login
Headers: Authorization: Basic <qualquer_base64>
```

#### Consultar CPF
```bash
GET http://localhost:3006/credit-services/person-information-report/v1/creditreport?reportName=RELATORIO_BASICO_PF_PME
Headers: 
  Authorization: Bearer <token>
  X-Document-id: <cpf>
```

#### Consultar CNPJ
```bash
GET http://localhost:3006/credit-services/business-information-report/v1/reports?reportName=RELATORIO_BASICO_PJ_PME
Headers:
  Authorization: Bearer <token>
  X-Document-id: <cnpj>
```

### 3. Desenvolva sua Solução

- Crie sua aplicação em qualquer linguagem
- Implemente os endpoints obrigatórios
- Adicione os diferenciais que conseguir
- Documente suas decisões

---

## 📊 Como você será avaliado

### Validação Automática
Executaremos o script `validate-challenge.sh` que testa:
- ✅ Funcionalidades obrigatórias
- ⚡ Performance e tempo de resposta
- 🔄 Cache (se implementado)
- 🚦 Rate limiting (se implementado)
- 📊 Métricas e observabilidade

### Análise de Código
- 🏗️ Arquitetura e organização
- 📝 Qualidade e legibilidade
- 🔒 Segurança e boas práticas
- 📚 Documentação

### Exemplo de Resposta Esperada

```json
// GET /api/v1/consulta/cpf/12345678901
{
  "success": true,
  "data": {
    "cpf": "12345678901",
    "nome": "João Silva",
    "score": 750,
    // ... outros dados do mock
  },
  "cached": false,
  "responseTime": "1.2s"
}
```

---

## 📦 O que entregar

1. **Código fonte** completo da sua solução
2. **README.md** com:
   - Instruções de execução
   - Tecnologias utilizadas
   - Decisões arquiteturais
   - Funcionalidades implementadas
3. **Dockerfile** e **docker-compose.yml**
4. **Testes** (se implementados)

---

## ⏰ Tempo Estimado

- **Solução básica**: 4-6 horas
- **Com diferenciais**: 8-12 horas

Não esperamos que você implemente TUDO. Foque no que você faz melhor e no que agregará mais valor.

---

## 💡 Dicas Importantes

1. **Comece pelo básico**: Faça funcionar primeiro, optimize depois
2. **Use o mock**: Ele simula delays e comportamentos reais
3. **Teste sua solução**: Execute `./validate-challenge.sh`
4. **Documente**: Explique suas decisões e trade-offs
5. **Commits**: Faça commits incrementais mostrando sua evolução

---

## ❓ FAQ

**P: Posso usar frameworks/bibliotecas?**
R: Sim! Use o que você conhece melhor.

**P: Preciso implementar todos os diferenciais?**
R: Não. Implemente o que fizer sentido e mostrar suas habilidades.

**P: E se eu tiver dúvidas sobre o mock?**
R: Consulte `curl-examples.md` para exemplos de uso.

**P: Posso mudar a estrutura dos endpoints?**
R: Os endpoints `/api/v1/consulta/cpf/{cpf}` e `/api/v1/consulta/cnpj/{cnpj}` são obrigatórios.

**P: O mock tem rate limiting?**
R: Sim, 100 requisições por 15 minutos. Sua aplicação deve lidar com HTTP 429.

---

## 🎯 Objetivo Final

Queremos avaliar:
- Sua capacidade de **integrar com APIs externas**
- Como você **estrutura e organiza código**
- Seu conhecimento de **boas práticas**
- Sua atenção a **requisitos não-funcionais** (performance, segurança, observabilidade)
- Como você **documenta e comunica** suas decisões

---

## 🚀 Boa sorte!

Estamos ansiosos para ver sua solução. Lembre-se: código limpo e funcional vale mais que features complexas mal implementadas.

**Quando terminar, execute:**
```bash
./validate-challenge.sh
```

Isso gerará um relatório com sua pontuação e feedback automático.

---

### 📞 Suporte

Se encontrar problemas com o mock server, verifique:
- Se está rodando: `docker ps`
- Logs: `docker-compose logs mock-serasa`
- Exemplos de uso: `curl-examples.md`