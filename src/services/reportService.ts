import fs from 'fs/promises';
import { config } from '../config/config';
import { logger } from '../utils/logger';

class ReportService {
  private payloadPF: any = null;
  private payloadPJ: any = null;

  async initialize(): Promise<void> {
    try {
      await this.loadPayloads();
    } catch (error) {
      logger.error('Failed to initialize ReportService', { error });
    }
  }

  private async loadPayloads(): Promise<void> {
    try {
      const [pfData, pjData] = await Promise.all([
        this.loadPayload(config.paths.payloadPF),
        this.loadPayload(config.paths.payloadPJ),
      ]);

      this.payloadPF = pfData;
      this.payloadPJ = pjData;

      logger.info('Payloads loaded successfully', {
        pf: !!this.payloadPF,
        pj: !!this.payloadPJ,
      });
    } catch (error) {
      logger.error('Error loading payloads', { error });
    }
  }

  private async loadPayload(filePath: string): Promise<any> {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error(`Error loading payload from ${filePath}`, { error });
      return null;
    }
  }

  async generateDelay(): Promise<number> {
    const { min, max } = config.delays;
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  async getPFReport(documentId: string, reportName: string): Promise<any> {
    if (!this.payloadPF) {
      throw new Error('PF payload not available');
    }

    const delay = await this.generateDelay();
    logger.info(`Generating PF report with ${delay}ms delay`, {
      documentId: documentId.substring(0, 3) + '***',
      reportName,
    });

    await new Promise(resolve => setTimeout(resolve, delay));

    const response = JSON.parse(JSON.stringify(this.payloadPF));
    
    if (response.reports?.[0]?.registration) {
      response.reports[0].registration.documentNumber = documentId;
      response.reports[0].reportName = reportName;
    }

    return response;
  }

  async getPJReport(documentId: string, reportName: string): Promise<any> {
    if (!this.payloadPJ) {
      throw new Error('PJ payload not available');
    }

    const delay = await this.generateDelay();
    logger.info(`Generating PJ report with ${delay}ms delay`, {
      documentId: documentId.substring(0, 8) + '***',
      reportName,
    });

    await new Promise(resolve => setTimeout(resolve, delay));

    const response = JSON.parse(JSON.stringify(this.payloadPJ));
    
    if (response.reports?.[0]?.registration) {
      response.reports[0].registration.documentId = documentId;
      response.reports[0].reportName = reportName;
    }

    return response;
  }

  getPayloadStatus(): { pf: boolean; pj: boolean } {
    return {
      pf: !!this.payloadPF,
      pj: !!this.payloadPJ,
    };
  }
}

export const reportService = new ReportService();