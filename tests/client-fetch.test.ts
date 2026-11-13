import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import Doofpi, { createClient, DoofpiClientError, type ClientFetch } from '../index';

describe('Client custom fetch', () => {
  let d: Doofpi;
  let globalFetch: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  const setup = () => {
    const routes = d.routes({
      users: {
        get: d.endpointBuilder
          .model({ input: z.object({ id: z.number() }), output: z.object({ id: z.number(), name: z.string() }) })
          .read(({ input }) => ({ id: input.id, name: `user-${input.id}` })),
        create: d.endpointBuilder
          .model({ input: z.object({ name: z.string() }), output: z.object({ name: z.string() }) })
          .write(({ input }) => ({ name: input.name })),
        fail: d.endpointBuilder.read(({ throwError }) => throwError({ message: 'nope', status: 418 }))
      },
      health: d.endpointBuilder.read(() => 'ok')
    });
    d.register(routes);
    return routes;
  };

  // Same adapter noofpi uses for in-process `lfetch`
  const localFetch: ClientFetch = (input, init) => d.fetch(new Request(input, init));

  beforeEach(() => {
    d = new Doofpi({ root: '/root' });
    globalFetch = vi.fn(() => Promise.reject(new Error('global fetch must not be used')));
    globalThis.fetch = globalFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('routes read requests through the custom fetch into d.fetch', async () => {
    const routes = setup();
    const client = createClient<typeof routes>({ url: 'http://localhost', root: '/root', fetch: localFetch });

    const user = await client.users.get.read({ id: 7 });

    expect(user).toEqual({ id: 7, name: 'user-7' });
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it('routes write requests and returns text responses', async () => {
    const routes = setup();
    const client = createClient<typeof routes>({ url: 'http://localhost', root: '/root', fetch: localFetch });

    expect(await client.users.create.write({ name: 'lior' })).toEqual({ name: 'lior' });
    expect(await client.health.read()).toBe('ok');
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it('passes the built url and init (including default headers) to the custom fetch', async () => {
    const routes = setup();
    const custom = vi.fn<ClientFetch>(localFetch);
    const client = createClient<typeof routes>({
      url: 'http://localhost',
      root: '/root',
      init: { headers: { cookie: 'a=1' } },
      fetch: custom
    });

    await client.users.get.read({ id: 1 });

    const [url, init] = custom.mock.calls[0]!;
    expect(url).toBe('http://localhost/root.users.get?input=%7B%22id%22%3A1%7D');
    expect(init?.method).toBe('GET');
    expect(new Headers(init?.headers).get('cookie')).toBe('a=1');
  });

  it('throws DoofpiClientError for error responses from d.fetch', async () => {
    const routes = setup();
    const client = createClient<typeof routes>({ url: 'http://localhost', root: '/root', fetch: localFetch });

    const error = await client.users.fail.read().catch(e => e);

    expect(error).toBeInstanceOf(DoofpiClientError);
    expect(error.status).toBe(418);
    expect(error.message).toBe('nope');
  });

  it('falls back to the global fetch when no custom fetch is given', async () => {
    globalFetch.mockResolvedValueOnce(
      new Response('"hi"', { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    const client = createClient<any>({ url: 'http://localhost', root: '/root' }) as any;

    expect(await client.health.read()).toBe('hi');
    expect(globalFetch).toHaveBeenCalledOnce();
  });

  it('uses the custom fetch for download and upload', async () => {
    const custom = vi.fn<ClientFetch>(async () => new Response('bytes'));
    const client = createClient<any>({ url: 'http://localhost', root: '/root', fetch: custom }) as any;

    expect(await (await client.file.download()).text()).toBe('bytes');
    await client.file.upload(undefined, 'data');

    expect(custom).toHaveBeenCalledTimes(2);
    expect(custom.mock.calls[1]![1]?.method).toBe('POST');
    expect(globalFetch).not.toHaveBeenCalled();
  });
});
