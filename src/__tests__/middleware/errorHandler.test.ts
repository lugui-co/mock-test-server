import { Request, Response } from 'express';
import { errorHandler } from '../../middleware/errorHandler';

describe('errorHandler', () => {
  const req = { path: '/x', method: 'GET' } as Request;
  let res: Partial<Response>;

  beforeEach(() => {
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  it('answers 500 and hides the message outside development', () => {
    errorHandler(new Error('boom'), req, res as Response, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error', message: undefined });
  });

  it('shows the message in development', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      errorHandler(new Error('boom'), req, res as Response, jest.fn());
    } finally {
      process.env.NODE_ENV = previous;
    }

    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error', message: 'boom' });
  });
});
