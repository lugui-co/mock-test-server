import { ReportService } from '../../services/reportService';

const PF_REPORT = 'RELATORIO_BASICO_PF_PME';
const PJ_REPORT = 'RELATORIO_BASICO_PJ_PME';
// Documentos sintéticos (dígitos verificadores válidos, não pertencem a ninguém conhecido).
const CPF = '52998224725';
const CNPJ = '11444777000161';

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    service = new ReportService();
    await service.initialize();
  });

  it('loads both payloads from the working directory', () => {
    expect(service.getPayloadStatus()).toEqual({ pf: true, pj: true });
  });

  it('returns the PF payload with the requested document and report name', async () => {
    const report = await service.getPFReport(CPF, PF_REPORT);

    expect(report.reports[0].registration.documentNumber).toBe(CPF);
    expect(report.reports[0].reportName).toBe(PF_REPORT);
  });

  it('returns the PJ payload with the requested document in registration.documentId', async () => {
    const report = await service.getPJReport(CNPJ, PJ_REPORT);

    expect(report.reports[0].registration.documentId).toBe(CNPJ);
    expect(report.reports[0].reportName).toBe(PJ_REPORT);
  });

  it('does not mutate the payload kept in memory between calls', async () => {
    await service.getPFReport(CPF, PF_REPORT);
    const second = await service.getPFReport('00000000191', PF_REPORT);

    expect(second.reports[0].registration.documentNumber).toBe('00000000191');
  });

  it('throws a random error with status and code when the draw falls under ERROR_CHANCE_PERCENT', async () => {
    // ERROR_CHANCE_PERCENT=0 nos testes (config lida no import): forçamos o sorteio
    // e escolhemos o erro controlando Math.random.
    jest
      .spyOn(service as unknown as { shouldGenerateRandomError: () => boolean }, 'shouldGenerateRandomError')
      .mockReturnValue(true);
    jest.spyOn(Math, 'random').mockReturnValue(0); // primeiro erro da lista: 400 INVALID_DOCUMENT

    await expect(service.getPJReport(CNPJ, PJ_REPORT)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_DOCUMENT',
    });
  });

  it('picks the last error of the list when Math.random is close to 1', async () => {
    jest
      .spyOn(service as unknown as { shouldGenerateRandomError: () => boolean }, 'shouldGenerateRandomError')
      .mockReturnValue(true);
    jest.spyOn(Math, 'random').mockReturnValue(0.999);

    await expect(service.getPFReport(CPF, PF_REPORT)).rejects.toMatchObject({
      status: 503,
      code: 'EXTERNAL_SERVICE_DOWN',
    });
  });

  it('never draws a random error when ERROR_CHANCE_PERCENT is 0', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    await expect(service.getPFReport(CPF, PF_REPORT)).resolves.toHaveProperty('reports');
  });

  it('fails with a clear message when the payload is missing', async () => {
    const empty = new ReportService();

    await expect(empty.getPFReport(CPF, PF_REPORT)).rejects.toThrow('PF payload not available');
    await expect(empty.getPJReport(CNPJ, PJ_REPORT)).rejects.toThrow('PJ payload not available');
    expect(empty.getPayloadStatus()).toEqual({ pf: false, pj: false });
  });

  it('generates delays inside [MIN_DELAY, MAX_DELAY]', async () => {
    await expect(service.generateDelay()).resolves.toBe(0);
  });
});
