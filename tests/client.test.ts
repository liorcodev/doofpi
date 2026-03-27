import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient, DoofpiClientError } from '../index';

describe('Client Test', () => {
  let originalFetch: typeof fetch;

  const mockFetch = (handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>) => {
    globalThis.fetch = handler as typeof fetch;
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should perform a read request with input encoded as query string', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    mockFetch(async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const result = await client.users.profile.read({ id: '123' });

    expect(result).toEqual({ ok: true });
    expect(capturedUrl).toContain('https://api.example.com/root.users.profile');
    expect(capturedUrl).toContain('input=%7B%22id%22%3A%22123%22%7D');
    expect(capturedInit?.method).toBe('GET');
  });

  it('should perform a read request without input (no query string appended)', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    let capturedUrl = '';

    mockFetch(async (input: string | URL | Request) => {
      capturedUrl = String(input);
      return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    });

    const result = await client.health.read();

    expect(result).toBe('ok');
    expect(capturedUrl).toBe('https://api.example.com/root.health');
  });

  it('should perform a write request with JSON body and Content-Type header', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    mockFetch(async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response('created', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    });

    const result = await client.items.create.write({ name: 'Book' });

    expect(result).toBe('created');
    expect(capturedUrl).toBe('https://api.example.com/root.items.create');
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.body).toBe('{"name":"Book"}');
    expect((capturedInit?.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('should include global headers from the init option', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root',
      init: { headers: { Authorization: 'Bearer token' } }
    }) as any;

    let capturedInit: RequestInit | undefined;

    mockFetch(async (_: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    await client.users.read();

    expect((capturedInit?.headers as Headers).get('Authorization')).toBe('Bearer token');
  });

  it('should use default root /doofpi when root is not provided', async () => {
    const client = createClient<any>({ url: 'https://api.example.com' }) as any;

    let capturedUrl = '';

    mockFetch(async (input: string | URL | Request) => {
      capturedUrl = String(input);
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    await client.health.read();

    expect(capturedUrl).toBe('https://api.example.com/doofpi.health');
  });

  it('should throw DoofpiClientError for non-json error response', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    mockFetch(async () => {
      return new Response('ignored', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    });

    await expect(client.fail.read()).rejects.toMatchObject({
      name: 'DoofpiClientError',
      message: 'Request failed with status 500',
      status: 500
    });
  });

  it('should populate DoofpiClientError fields from json error payload', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    const payload = {
      message: 'Validation failed',
      details: { field: 'email' },
      error: { code: 'BAD_INPUT' }
    };

    mockFetch(async () => {
      return new Response(JSON.stringify(payload), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    try {
      await client.validation.write({});
      throw new Error('Expected DoofpiClientError');
    } catch (error) {
      expect(error).toBeInstanceOf(DoofpiClientError);
      expect(error).toMatchObject({
        message: 'Validation failed',
        status: 400,
        details: { field: 'email' },
        error: { code: 'BAD_INPUT' }
      });
    }
  });

  it('should support AbortController signal for cancellation', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    const abortController = new AbortController();

    mockFetch(async (_: string | URL | Request, init?: RequestInit) => {
      // Simulate abort during fetch
      if (init?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return new Response('ok', { status: 200 });
    });

    abortController.abort();

    try {
      await client.users.read(undefined, { signal: abortController.signal });
      throw new Error('Expected AbortError');
    } catch (error: any) {
      expect(error.name).toBe('AbortError');
    }
  });

  it('should handle empty response body with 200 status', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    mockFetch(async () => {
      return new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    });

    const result = await client.empty.read();
    expect(result).toBe('');
  });

  it('should handle malformed JSON response', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    mockFetch(async () => {
      return new Response('{invalid-json}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    try {
      await client.malformed.read();
      throw new Error('Expected error');
    } catch (error) {
      expect(error).toBeInstanceOf(DoofpiClientError);
      expect((error as DoofpiClientError).message).toBe('Failed to parse response body');
    }
  });

  it('should pass cache and credentials options', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    let capturedInit: RequestInit | undefined;

    mockFetch(async (_: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return new Response('ok', { status: 200 });
    });

    await client.users.read(undefined, { cache: 'no-cache', credentials: 'include' });

    expect(capturedInit?.cache).toBe('no-cache');
    expect(capturedInit?.credentials).toBe('include');
  });

  it('should perform write request without input', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    mockFetch(async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    });

    const result = await client.items.create.write();

    expect(result).toBe('ok');
    expect(capturedUrl).toBe('https://api.example.com/root.items.create');
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.body).toBeUndefined();
  });

  it('should return null when successful response has no supported body content type', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    mockFetch(async () => {
      return new Response(null, { status: 200 });
    });

    const result = await client.health.read();
    expect(result).toBeNull();
  });

  it('should throw DoofpiClientError when text body parsing fails', async () => {
    const client = createClient<any>({
      url: 'https://api.example.com',
      root: '/root'
    }) as any;

    mockFetch(async () => {
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'content-type' ? 'text/plain' : null)
        },
        text: async () => {
          throw new Error('cannot parse body');
        },
        json: async () => ({})
      } as unknown as Response;
    });

    await expect(client.broken.read()).rejects.toMatchObject({
      name: 'DoofpiClientError',
      message: 'Failed to parse response body',
      status: 200
    });
  });
});
