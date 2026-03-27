import { beforeEach, describe, expect, it } from 'vitest';
import Doofpi from '../index';

describe('Context Test', () => {
  let d: Doofpi<any, any, any, any>;
  beforeEach(() => {
    d = new Doofpi({ root: '/root' });
  });

  it('should define context', async () => {
    const doofpi = d.createContext(() => ({ user: { id: '123' } }));

    const routes = doofpi.routes({
      home: doofpi.endpointBuilder.read(({ ctx }) => ctx.user.id)
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('123');
  });
  it('should pass env to fetch', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(({ env }) => env.API_KEY)
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'), { API_KEY: 'secret' });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('secret');
  });
  it('should throw error when createContext is called multiple times', () => {
    d.createContext(() => ({ user: { id: '1' } }));
    expect(() => d.createContext(() => ({ user: { id: '2' } }))).toThrow('createContext handler is already defined');
  });
  it('should handle errors thrown in createContext', async () => {
    const doofpi = d.createContext(() => {
      throw new Error('Context creation failed');
    });

    const routes = doofpi.routes({
      home: doofpi.endpointBuilder.read(() => 'home')
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(500);
    const json = (await res.json()) as { message: string };
    expect(json.message).toBe('Internal Server Error');
  });
  it('should handle async errors in createContext', async () => {
    const doofpi = d.createContext(async () => {
      await Promise.resolve();
      throw new Error('Async context error');
    });

    const routes = doofpi.routes({
      home: doofpi.endpointBuilder.read(() => 'home')
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(500);
  });
  it('should access request info in createContext', async () => {
    let capturedPath = '';
    const doofpi = d.createContext(({ path }) => {
      capturedPath = path;
      return { user: { id: '123' } };
    });

    const routes = doofpi.routes({
      home: doofpi.endpointBuilder.read(() => 'home')
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    expect(capturedPath).toBe('/root.home');
  });
  it('should pass extra to fetch', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(({ extra }) => extra.customData)
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'), undefined, { customData: 'extra-value' });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('extra-value');
  });
  it('should access extra in createContext', async () => {
    let capturedExtra = '';
    const doofpi = d.createContext(({ extra }) => {
      capturedExtra = extra.info;
      return { user: { id: '123' } };
    });

    const routes = doofpi.routes({
      home: doofpi.endpointBuilder.read(() => 'home')
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.home'), undefined, { info: 'runtime-data' });
    expect(res.status).toBe(200);
    expect(capturedExtra).toBe('runtime-data');
  });
  it('should pass env and extra together', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(({ env, extra }) => `${env.API_KEY}-${extra.requestId}`)
    });
    d.register(routes);

    const res = await d.fetch(
      new Request('http://localhost/root.home'),
      { API_KEY: 'secret' },
      { requestId: 'req-123' }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('secret-req-123');
  });
});
