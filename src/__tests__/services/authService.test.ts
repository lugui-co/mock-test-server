import { AuthService, authService } from '../../services/authService';

describe('AuthService', () => {
  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const clientId = 'test-client-123';
      const result = authService.generateToken(clientId);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.token).toBe('string');
      expect(typeof result.expiresIn).toBe('number');
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should generate different tokens for different clients', () => {
      const client1 = 'client-1';
      const client2 = 'client-2';

      const token1 = authService.generateToken(client1);
      const token2 = authService.generateToken(client2);

      expect(token1.token).not.toBe(token2.token);
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', () => {
      const clientId = 'test-client';
      const { token } = authService.generateToken(clientId);

      const isValid = authService.validateToken(token);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid token', () => {
      const invalidToken = 'invalid-token-12345';
      const isValid = authService.validateToken(invalidToken);
      expect(isValid).toBe(false);
    });

    it('should reject an expired token', () => {
      // config é lido no import, então mudar TOKEN_EXPIRY aqui não teria efeito:
      // controlamos o relógio em vez disso.
      const now = Date.now();
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
      const { token, expiresIn } = authService.generateToken('test-client');

      nowSpy.mockReturnValue(now + expiresIn * 1000 + 1);

      expect(authService.validateToken(token)).toBe(false);
    });

    it('should reject a tampered token (not issued by this process)', () => {
      const { token } = authService.generateToken('test-client');
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      decoded.hash = '0'.repeat(64);
      const tampered = Buffer.from(JSON.stringify(decoded)).toString('base64');

      expect(authService.validateToken(tampered)).toBe(false);
    });

    it('should accept a token sent without base64 padding', () => {
      const { token } = authService.generateToken('padding-client');

      expect(authService.validateToken(token.replace(/=+$/, ''))).toBe(true);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should remove only expired tokens', () => {
      const service = new AuthService();
      const now = Date.now();
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
      const { expiresIn } = service.generateToken('old-client');
      nowSpy.mockReturnValue(now + expiresIn * 1000 + 1);
      service.generateToken('new-client');

      service.cleanupExpiredTokens();

      expect(service.getActiveTokenCount()).toBe(1);
    });
  });

  describe('getActiveTokenCount', () => {
    it('should return the correct number of active tokens', () => {
      const initialCount = authService.getActiveTokenCount();

      authService.generateToken('client-1');
      authService.generateToken('client-2');

      const newCount = authService.getActiveTokenCount();
      expect(newCount).toBe(initialCount + 2);
    });
  });
});