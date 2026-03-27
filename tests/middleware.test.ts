import { beforeEach, describe, expect, it, test } from 'vitest';
import Doofpi from '../index';

describe('Middleware Test', () => {
  let d: Doofpi<any, any, any, any>;
  beforeEach(() => {
    d = new Doofpi({ root: '/root' });
  });

  it('should define middleware and execute it in the correct order', async () => {
    const middlewareExecuted: number[] = [];
    const endpointBuilderWithMiddlewares = d.endpointBuilder
      .middleware(() => {
        middlewareExecuted.push(1);
      })
      .middleware(() => {
        middlewareExecuted.push(2);
      });

    const routes = d.routes({
      home: endpointBuilderWithMiddlewares.read(() => 'home')
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('home');
    expect(middlewareExecuted).toEqual([1, 2]);
  });
  test('middleware should be able to modify the context', async () => {
    const doofpi = d.createContext(() => ({ value: 0 }));
    const routes = doofpi.routes({
      increment: doofpi.endpointBuilder
        .middleware(({ ctx }) => {
          ctx.value += 1;
        })
        .read(({ ctx }) => `Value: ${ctx.value}`)
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.increment'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('Value: 1');
  });
  test('middleware should be able to break the request flow by throwing errors', async () => {
    const routes = d.routes({
      error: d.endpointBuilder
        .middleware(({ throwError }) => {
          return throwError({ message: 'Middleware Error', status: 400 });
        })
        .read(() => 'This should not be reached')
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.error'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ message: 'Middleware Error' });
  });
  test('middleware should have access to extra parameter', async () => {
    let capturedExtra = '';
    const routes = d.routes({
      home: d.endpointBuilder
        .middleware(({ extra }) => {
          capturedExtra = extra.requestId;
        })
        .read(() => 'home')
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'), undefined, { requestId: 'middleware-123' });
    expect(res.status).toBe(200);
    expect(capturedExtra).toBe('middleware-123');
  });
});
