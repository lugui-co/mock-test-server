import express from 'express';
import request from 'supertest';
import routes from '../../routes';
import { errorHandler } from '../../middleware/errorHandler';
import { requestLogger } from '../../middleware/requestLogger';
import { reportService } from '../../services/reportService';

// Mesmo encadeamento de src/index.ts, sem rate limit global nem listen.
const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(routes);
app.use(errorHandler);

const LOGIN = '/security/iam/v1/client-identities/login';
const PF = '/credit-services/person-information-report/v1/creditreport';
const PJ = '/credit-services/business-information-report/v1/reports';
// Documentos sintéticos.
const CPF = '52998224725';
const CNPJ = '11444777000161';

async function login(): Promise<string> {
  const res = await request(app)
    .post(LOGIN)
    .set('Authorization', `Basic ${Buffer.from('candidato:senha').toString('base64')}`);
  return res.body.accessToken;
}

describe('HTTP routes (integration)', () => {
  beforeAll(async () => {
    await reportService.initialize();
  });

  it('GET /health reports payloads loaded', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'healthy', payloads: { pf: true, pj: true } });
  });

  describe('login', () => {
    it('returns a Bearer token with expiresIn as string', async () => {
      const res = await request(app).post(LOGIN).set('Authorization', 'Basic YTpi');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: '3600',
        scope: ['read', 'write'],
      });
    });

    it('rejects a request without Basic auth', async () => {
      const res = await request(app).post(LOGIN);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciais inválidas');
    });
  });

  describe('PF report', () => {
    it('returns the report for a valid token and document', async () => {
      const token = await login();
      const res = await request(app)
        .get(PF)
        .query({ reportName: 'RELATORIO_BASICO_PF_PME' })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Document-id', CPF);

      expect(res.status).toBe(200);
      expect(res.body.reports[0].registration.documentNumber).toBe(CPF);
    });

    it('returns 400 for a wrong reportName', async () => {
      const token = await login();
      const res = await request(app)
        .get(PF)
        .query({ reportName: 'RELATORIO_BASICO_PJ_PME' })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Document-id', CPF);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('reportName');
    });

    it('returns 400 without X-Document-id', async () => {
      const token = await login();
      const res = await request(app)
        .get(PF)
        .query({ reportName: 'RELATORIO_BASICO_PF_PME' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('documentId');
    });

    it('returns 401 without a token', async () => {
      const res = await request(app)
        .get(PF)
        .query({ reportName: 'RELATORIO_BASICO_PF_PME' })
        .set('X-Document-id', CPF);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token não fornecido');
    });

    it('returns 401 for a token not issued by the server', async () => {
      const res = await request(app)
        .get(PF)
        .query({ reportName: 'RELATORIO_BASICO_PF_PME' })
        .set('Authorization', 'Bearer not-a-token')
        .set('X-Document-id', CPF);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token inválido ou expirado');
    });

    it('propagates the random error status and code', async () => {
      const token = await login();
      jest
        .spyOn(reportService as unknown as { shouldGenerateRandomError: () => boolean }, 'shouldGenerateRandomError')
        .mockReturnValue(true);
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // índice 3: 429 RATE_LIMIT_EXCEEDED

      const res = await request(app)
        .get(PF)
        .query({ reportName: 'RELATORIO_BASICO_PF_PME' })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Document-id', CPF);

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        error: 'Failed to generate report',
        message: 'Too Many Requests - Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
      });
    });
  });

  describe('PJ report', () => {
    it('returns the report with the document in registration.documentId', async () => {
      const token = await login();
      const res = await request(app)
        .get(PJ)
        .query({ reportName: 'RELATORIO_BASICO_PJ_PME' })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Document-id', CNPJ);

      expect(res.status).toBe(200);
      expect(res.body.reports[0].registration.documentId).toBe(CNPJ);
    });

    it('returns 500 without code when the payload is unavailable', async () => {
      const token = await login();
      jest.spyOn(reportService, 'getPJReport').mockRejectedValue(new Error('PJ payload not available'));

      const res = await request(app)
        .get(PJ)
        .query({ reportName: 'RELATORIO_BASICO_PJ_PME' })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Document-id', CNPJ);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to generate report', message: 'PJ payload not available' });
    });
  });

  it('returns 404 with the path for unknown routes', async () => {
    const res = await request(app).get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Endpoint not found', path: '/nao-existe' });
  });
});
