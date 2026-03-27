import { beforeEach, describe, expect, it } from 'vitest';
import Doofpi from '../index';
import z from 'zod';
import type { ErrorShape } from '../src/errors';
import { DoofpiError, NotFoundError, MethodNotAllowedError, ValidationError, InternalServerError } from '../src/errors';

describe('Errors Test', () => {
  let d: Doofpi<any, any, any, any>;
  beforeEach(() => {
    d = new Doofpi({ root: '/root' });
  });

  it('should throw an error within a routes', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(({ throwError }) => {
        return throwError({
          message: 'Something went wrong',
          status: 500
        });
      })
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(500);
  });
  it('should handle global errors', async () => {
    let errorMessage = '';
    d.onError(({ error }) => {
      errorMessage = error.message;
    });

    const routes = d.routes({
      home: d.endpointBuilder.read(({ throwError }) => {
        return throwError({
          message: 'Global error',
          status: 500
        });
      })
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(500);
    expect(errorMessage).toBe('Global error');
  });
  it('should filter error properties', async () => {
    d.onError(({ error }) => {
      return {
        message: error.message,
        status: error.status,
        error: undefined,
        issues: undefined,
        details: undefined
      };
    });
    const routes = d.routes({
      home: d.endpointBuilder.read(({ throwError }) => {
        return throwError({
          message: 'Custom error',
          status: 400
        });
      })
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({
      message: 'Custom error'
    });
    expect(json).not.toHaveProperty('error');
    expect(json).not.toHaveProperty('issues');
    expect(json).not.toHaveProperty('details');
  });
  it('should handle issues thrown by validation', async () => {
    d.onError(({ error }) => {
      return {
        message: error.message,
        status: error.status,
        issues: error.issues
      };
    });
    const routes = d.routes({
      home: d.endpointBuilder.model({ input: z.object({ key: z.string() }) }).read(({ input }) => {
        return `Hello, ${input}`;
      })
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home?input={ "key": 123 }'));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { issues: Required<ErrorShape>['issues'] };
    expect(json.issues[0]?.message).toBe('Invalid input: expected string, received number');
  });
  it('should modify the header of the error response', async () => {
    d.onError(({ error, headers }) => {
      headers.set('X-Custom-Header', 'CustomValue');
      return {
        message: error.message,
        status: error.status
      };
    });
    const routes = d.routes({
      home: d.endpointBuilder.read(({ throwError }) => {
        return throwError({
          message: 'Header error',
          status: 400
        });
      })
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(400);
    expect(res.headers.get('X-Custom-Header')).toBe('CustomValue');
  });
  it('should have access to extra parameter in onError', async () => {
    let capturedExtra = '';
    d.onError(({ error, extra }) => {
      capturedExtra = extra.traceId;
      return {
        message: error.message,
        status: error.status
      };
    });
    const routes = d.routes({
      home: d.endpointBuilder.read(({ throwError }) => {
        return throwError({
          message: 'Error with extra',
          status: 400
        });
      })
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'), undefined, { traceId: 'trace-456' });
    expect(res.status).toBe(400);
    expect(capturedExtra).toBe('trace-456');
  });
  it('should throw error when onError is called multiple times', () => {
    d.onError(() => {});
    expect(() => d.onError(() => {})).toThrow('onError handler is already defined');
  });
  it('should throw error when onRequest is called multiple times', () => {
    d.onRequest(() => {});
    expect(() => d.onRequest(() => {})).toThrow('onRequest handler is already defined');
  });
});

describe('Error Classes Test', () => {
  it('should create DoofpiError with all properties', () => {
    const issues: z.core.$ZodIssue[] = [
      {
        code: 'custom',
        path: ['field'],
        message: 'issue1'
      }
    ];
    const error = new DoofpiError({
      message: 'Test error',
      status: 400,
      issues,
      error: { code: 'TEST' },
      details: { field: 'test' }
    });

    expect(error.name).toBe('DoofpiError');
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.issues).toEqual(issues);
    expect(error.error).toEqual({ code: 'TEST' });
    expect(error.details).toEqual({ field: 'test' });
    expect(error).toBeInstanceOf(Error);
  });

  it('should create NotFoundError with default message', () => {
    const error = new NotFoundError();

    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Not Found');
    expect(error.status).toBe(404);
  });

  it('should create NotFoundError with custom message', () => {
    const error = new NotFoundError('Custom not found');

    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Custom not found');
    expect(error.status).toBe(404);
  });

  it('should create MethodNotAllowedError with default message', () => {
    const error = new MethodNotAllowedError();

    expect(error.name).toBe('MethodNotAllowedError');
    expect(error.message).toBe('Method Not Allowed');
    expect(error.status).toBe(405);
  });

  it('should create ValidationError with issues', () => {
    const issues: z.core.$ZodIssue[] = [
      {
        code: 'custom',
        path: ['email'],
        message: 'Invalid field'
      }
    ];
    const error = new ValidationError({ issues });

    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation Error');
    expect(error.status).toBe(400);
    expect(error.issues).toEqual(issues);
  });

  it('should create ValidationError with custom message', () => {
    const error = new ValidationError({ message: 'Custom validation error', issues: [] });

    expect(error.message).toBe('Custom validation error');
  });

  it('should create InternalServerError with default message', () => {
    const error = new InternalServerError({});

    expect(error.name).toBe('InternalServerError');
    expect(error.message).toBe('Internal Server Error');
    expect(error.status).toBe(500);
  });

  it('should create InternalServerError with error object', () => {
    const originalError = new Error('Original error');
    const error = new InternalServerError({ error: originalError });

    expect(error.error).toBe(originalError);
    expect(error.status).toBe(500);
  });
});
