import { logger } from '../utils/logger';

// Logs não poluem a saída dos testes (spies em logger.* continuam funcionando).
logger.silent = true;

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
