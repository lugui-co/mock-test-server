// Ambiente fixo e fictício para os testes: não depende de .env local, fuso nem sorte.
// Roda antes de qualquer import (jest setupFiles), porque config.ts lê process.env no import
// (o dotenv não sobrescreve variáveis já definidas).
process.env.TZ = 'UTC';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.JWT_SECRET = 'test-secret-not-real';
process.env.TOKEN_EXPIRY = '3600';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.LOG_LEVEL = 'error';
process.env.LOG_DIR = 'logs';
process.env.MIN_DELAY = '0';
process.env.MAX_DELAY = '0';
process.env.ERROR_CHANCE_PERCENT = '0';
