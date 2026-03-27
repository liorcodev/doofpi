import { beforeEach, describe, expect, it } from 'vitest';
import Doofpi from '../index';
import { z } from 'zod';
import type { ErrorShape } from '../src/errors';

describe('Validation Test', () => {
  let d: Doofpi;
  beforeEach(() => {
    d = new Doofpi({ root: '/root' });
  });

  it('should validate input correctly for read operations', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder.model({ input: z.object({ key: z.number() }) }).read(({ input }) => input)
        }
      }
    });
    d.register(routes);

    let res = await d.fetch(new Request('http://localhost/root.home.sub.data?input={ "key": "123" }'));
    expect(res.status).toBe(400);
    res = await d.fetch(new Request('http://localhost/root.home.sub.data?input={ "key": 123 }'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ key: 123 });
  });
  it('should validate input correctly for write operations', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder.model({ input: z.object({ key: z.number() }) }).write(({ input }) => input)
        }
      }
    });
    d.register(routes);
    let res = await d.fetch(
      new Request('http://localhost/root.home.sub.data', {
        method: 'POST',
        body: JSON.stringify({ key: '123' }),
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(res.status).toBe(400);
    res = await d.fetch(
      new Request('http://localhost/root.home.sub.data', {
        method: 'POST',
        body: JSON.stringify({ key: 123 }),
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ key: 123 });
  });
  it('should validate output correctly for read operations', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder
            .model({ output: z.object({ key: z.number() }) })
            .read(() => ({ key: '123' as unknown as number })),
          some: d.endpointBuilder.model({ output: z.object({ key: z.number() }) }).read(() => ({ key: 123 }))
        }
      }
    });
    d.register(routes);
    let res = await d.fetch(new Request('http://localhost/root.home.sub.data'));
    expect(res.status).toBe(500);
    res = await d.fetch(new Request('http://localhost/root.home.sub.some'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ key: 123 });
  });
  it('should validate output correctly for write operations', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder
            .model({ output: z.object({ key: z.number() }) })
            .write(() => ({ key: '123' as unknown as number })),
          some: d.endpointBuilder.model({ output: z.object({ key: z.number() }) }).write(() => ({ key: 123 }))
        }
      }
    });
    d.register(routes);
    let res = await d.fetch(new Request('http://localhost/root.home.sub.data', { method: 'POST' }));
    expect(res.status).toBe(500);
    res = await d.fetch(new Request('http://localhost/root.home.sub.some', { method: 'POST' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ key: 123 });
  });

  it('should include issues and error field in output validation failure response', async () => {
    const routes = d.routes({
      data: d.endpointBuilder
        .model({ output: z.object({ key: z.number() }) })
        .read(() => ({ key: 'not-a-number' as unknown as number }))
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.data'));
    expect(res.status).toBe(500);

    const body = (await res.json()) as ErrorShape;
    expect(body.message).toBe('Internal Server Error');
    expect(body.error).toBe('Output validation failed');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body?.issues?.length).toBeGreaterThan(0);
  });

  it('should include issues and error field in output validation failure response for write', async () => {
    const routes = d.routes({
      data: d.endpointBuilder
        .model({ output: z.object({ key: z.number() }) })
        .write(() => ({ key: 'not-a-number' as unknown as number }))
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.data', { method: 'POST' }));
    expect(res.status).toBe(500);

    const body = (await res.json()) as ErrorShape;
    expect(body.message).toBe('Internal Server Error');
    expect(body.error).toBe('Output validation failed');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body?.issues?.length).toBeGreaterThan(0);
  });
});
