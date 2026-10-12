import { Request, Response } from 'express';
import { requestLogger, sanitizeHeaders } from '../../middleware/requestLogger';
import { logger } from '../../utils/logger';

describe('requestLogger', () => {
  it('masks Authorization, X-Document-id and cookies', () => {
    expect(
      sanitizeHeaders({
        authorization: 'Bearer abc.def',
        'x-document-id': '52998224725',
        cookie: 'sid=1',
        accept: 'application/json',
      })
    ).toEqual({
      authorization: 'Bearer ***',
      'x-document-id': '529***',
      cookie: '***',
      accept: 'application/json',
    });
  });

  it('never writes the full token, document or body to the log', () => {
    const info = jest.spyOn(logger, 'info');
    const send = jest.fn();
    const req = {
      method: 'GET',
      path: '/x',
      query: {},
      ip: '127.0.0.1',
      headers: { authorization: 'Bearer secret-token', 'x-document-id': '52998224725' },
      body: { password: 'secret-body' },
    } as unknown as Request;
    const res = { send, statusCode: 200 } as unknown as Response;
    const next = jest.fn();

    requestLogger(req, res, next);
    res.send('ok');

    expect(next).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith('ok');
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).not.toContain('secret-token');
    expect(logged).not.toContain('52998224725');
    expect(logged).not.toContain('secret-body');
  });
});
