import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import Doofpi from '../index';

describe('Base Test', () => {
  let d: Doofpi;
  beforeEach(() => {
    d = new Doofpi({ root: '/root' });
  });

  it('should register and fetch data correctly', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder.read(() => 'data'),
          posts: d.endpointBuilder.write(() => 'posts')
        }
      }
    });
    d.register(routes);

    let res = await d.fetch(new Request('http://localhost/root.home.sub.data'));
    let text = await res.text();
    expect(text).toBe('data');

    res = await d.fetch(new Request('http://localhost/root.home.sub.posts', { method: 'POST' }));
    text = await res.text();
    expect(text).toBe('posts');
  });
  it('should return an object correctly', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder.read(() => ({ key: 'value' }))
        }
      }
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home.sub.data'));
    expect(res.headers.get('Content-Type')).toContain('application/json');

    const json = await res.json();
    expect(json).toEqual({ key: 'value' });
  });
  it('should return 404 for unregistered routes', async () => {
    const res = await d.fetch(new Request('http://localhost/root.unknown.routes'));
    expect(res.status).toBe(404);
  });
  it('should return 405 for unsupported methods', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder.read(() => 'data')
        }
      }
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home.sub.data', { method: 'POST' }));
    expect(res.status).toBe(405);
  });
  it('should parse query parameters correctly', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder.read(({ input }) => {
            return input;
          })
        }
      }
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home.sub.data?input={ "key": "value" }'));
    const json = await res.json();
    expect(json).toEqual({ key: 'value' });
  });
  it('should parse JSON body correctly', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder.write(async ({ input }) => {
            return input;
          })
        }
      }
    });
    d.register(routes);

    const res = await d.fetch(
      new Request('http://localhost/root.home.sub.data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'value' })
      })
    );
    const json = await res.json();
    expect(json).toEqual({ key: 'value' });
  });
  it('should return an error for invalid JSON body', async () => {
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder.write(async ({ input }) => {
            return input;
          })
        }
      }
    });
    d.register(routes);

    const res = await d.fetch(
      new Request('http://localhost/root.home.sub.data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid-json}'
      })
    );
    const json = await res.json();
    expect(json).toEqual({ message: 'Invalid JSON in request body' });
  });
  it('should rewrite the response correctly', async () => {
    d.onResponse(({ res }) => {
      res.headers.set('X-Custom-Header', 'CustomValue');
    });
    const routes = d.routes({
      home: {
        sub: {
          data: d.endpointBuilder.read(() => 'data')
        }
      }
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home.sub.data'));
    expect(res.headers.get('X-Custom-Header')).toBe('CustomValue');
  });
  it('should execute onRequest hook after context creation', async () => {
    let requestPath = '';
    let hasContext = false;
    const doofpi = d.createContext(() => ({ user: { id: '123' } }));
    doofpi.onRequest(({ path, ctx }) => {
      requestPath = path;
      hasContext = !!ctx.user;
    });
    const routes = doofpi.routes({
      home: doofpi.endpointBuilder.read(() => 'home')
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    expect(requestPath).toBe('/root.home');
    expect(hasContext).toBe(true);
  });
  it('should allow onRequest to throw errors', async () => {
    d.onRequest(({ throwError }) => {
      throwError({ status: 403, message: 'Forbidden' });
    });
    const routes = d.routes({
      home: d.endpointBuilder.read(() => 'home')
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(403);
    const json = (await res.json()) as { message: string };
    expect(json.message).toBe('Forbidden');
  });
  it('should throw error when onResponse is called multiple times', () => {
    d.onResponse(() => {});
    expect(() => d.onResponse(() => {})).toThrow('onResponse handler is already defined');
  });
  it('should modify headers in endpoint handlers', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(({ headers }) => {
        headers.set('X-Endpoint-Header', 'EndpointValue');
        return 'data';
      })
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Endpoint-Header')).toBe('EndpointValue');
  });
  it('should handle null return value', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(() => null)
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('');
  });
  it('should handle undefined return value', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(() => undefined)
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('');
  });
  it('should handle number return value', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(() => 42)
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('42');
  });
  it('should handle boolean return value', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(() => true)
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('true');
  });
  it('should handle array return value', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(() => [1, 2, 3])
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const json = await res.json();
    expect(json).toEqual([1, 2, 3]);
  });
  it('should handle html string return value', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(({ headers }) => {
        headers.set('Content-Type', 'text/html');
        return '<h1>Hello</h1>';
      })
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('<h1>Hello</h1>');
  });
  it('should handle multiple register calls', async () => {
    const routes1 = d.routes({
      home: d.endpointBuilder.read(() => 'home')
    });
    const routes2 = d.routes({
      about: d.endpointBuilder.read(() => 'about')
    });
    d.register(routes1);
    d.register(routes2);

    let res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    let text = await res.text();
    expect(text).toBe('home');

    res = await d.fetch(new Request('http://localhost/root.about'));
    expect(res.status).toBe(200);
    text = await res.text();
    expect(text).toBe('about');
  });
  it('should handle write endpoint without content-type header', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.write(({ input }) => input)
    });
    d.register(routes);

    const res = await d.fetch(
      new Request('http://localhost/root.home', {
        method: 'POST'
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({});
  });
  it('should handle invalid JSON in query parameter', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.read(({ input }) => input)
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home?input={invalid-json}'));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { message: string };
    expect(json.message).toBe('Invalid JSON in input query parameter');
  });
  it('should handle deep route nesting', async () => {
    const routes = d.routes({
      level1: {
        level2: {
          level3: {
            level4: {
              level5: d.endpointBuilder.read(() => 'deeply-nested')
            }
          }
        }
      }
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.level1.level2.level3.level4.level5'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('deeply-nested');
  });
  it('should support defineEnv for type-level environment definition', async () => {
    type MyEnv = { DATABASE_URL: string };
    const doofpi = d.defineEnv<MyEnv>();
    const routes = doofpi.routes({
      home: doofpi.endpointBuilder.read(() => 'home')
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('home');
  });
  it('should support defineExtra for type-level extra definition', async () => {
    type MyExtra = { logger: { log: (msg: string) => void } };
    const doofpi = d.defineExtra<MyExtra>();
    const routes = doofpi.routes({
      home: doofpi.endpointBuilder.read(() => 'home')
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('home');
  });
  it('should use default root when constructed without options', async () => {
    const doofpi = new Doofpi();
    const routes = doofpi.routes({
      ping: doofpi.endpointBuilder.read(() => 'pong')
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/doofpi.ping'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('pong');
  });
  it('should support defineMeta for type-level meta definition', async () => {
    type MyMeta = { role: string };
    const doofpi = d.defineMeta<MyMeta>();
    const routes = doofpi.routes({
      home: doofpi.endpointBuilder.meta({ role: 'admin' }).read(({ meta }) => meta?.role)
    });
    doofpi.register(routes);

    const res = await doofpi.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('admin');
  });
  it('should stream raw bytes without JSON serialization', async () => {
    const routes = d.routes({
      file: d.endpointBuilder.download(() => new Uint8Array([1, 2, 3]))
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.file'));
    expect(res.status).toBe(200);
    const buffer = await res.arrayBuffer();
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3]));
  });
  it('should stream a Response returned directly, merging accumulated headers', async () => {
    d.onRequest(({ headers }) => {
      headers.set('X-From-Request', 'yes');
    });
    const routes = d.routes({
      file: d.endpointBuilder.download(
        () => new Response('file-content', { headers: { 'Content-Type': 'application/octet-stream' } })
      )
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.file'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(res.headers.get('X-From-Request')).toBe('yes');
    const text = await res.text();
    expect(text).toBe('file-content');
  });
  it('should validate input for stream endpoints', async () => {
    const routes = d.routes({
      file: d.endpointBuilder.download(({ input }) => `bytes-for-${(input as { id: string }).id}`)
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.file?input={"id":"abc"}'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('bytes-for-abc');
  });
  it('should return 405 when calling stream endpoint with POST', async () => {
    const routes = d.routes({
      file: d.endpointBuilder.download(() => 'data')
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.file', { method: 'POST' }));
    expect(res.status).toBe(405);
  });
  it('should handle invalid JSON in query parameter for stream endpoints', async () => {
    const routes = d.routes({
      file: d.endpointBuilder.download(({ input }) => JSON.stringify(input))
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.file?input={invalid-json}'));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { message: string };
    expect(json.message).toBe('Invalid JSON in input query parameter');
  });
  it('should validate input against model.input for stream endpoints', async () => {
    const routes = d.routes({
      file: d.endpointBuilder
        .model({ input: z.object({ id: z.string() }) })
        .download(({ input }) => `bytes-for-${input.id}`)
    });
    d.register(routes);

    const validRes = await d.fetch(new Request('http://localhost/root.file?input={"id":"abc"}'));
    expect(validRes.status).toBe(200);
    expect(await validRes.text()).toBe('bytes-for-abc');

    const invalidRes = await d.fetch(new Request('http://localhost/root.file?input={}'));
    expect(invalidRes.status).toBe(400);
    const json = (await invalidRes.json()) as { message: string };
    expect(json.message).toBe('Validation Error');
  });
  it('should run the onResponse hook for stream responses', async () => {
    d.onResponse(({ res }) => {
      res.headers.set('X-Stream-Response', 'yes');
    });
    const routes = d.routes({
      file: d.endpointBuilder.download(() => 'data')
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.file'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Stream-Response')).toBe('yes');
  });
  it('should not overwrite headers already set on a streamed Response', async () => {
    d.onRequest(({ headers }) => {
      headers.set('X-Custom', 'from-request');
    });
    const routes = d.routes({
      file: d.endpointBuilder.download(() => new Response('data', { headers: { 'X-Custom': 'from-response' } }))
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.file'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Custom')).toBe('from-response');
  });
  it('should upload raw bytes and receive a raw response back', async () => {
    const routes = d.routes({
      file: d.endpointBuilder.upload(async ({ req }) => {
        const bytes = new Uint8Array(await req.arrayBuffer());
        return new Uint8Array([...bytes].reverse());
      })
    });
    d.register(routes);

    const res = await d.fetch(
      new Request('http://localhost/root.file', { method: 'POST', body: new Uint8Array([1, 2, 3]) })
    );
    expect(res.status).toBe(200);
    const buffer = await res.arrayBuffer();
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([3, 2, 1]));
  });
  it('should validate input from the query string for upload endpoints, leaving the body untouched', async () => {
    const routes = d.routes({
      file: d.endpointBuilder.model({ input: z.object({ filename: z.string() }) }).upload(async ({ input, req }) => {
        const bytes = await req.arrayBuffer();
        return `${input.filename}:${bytes.byteLength}`;
      })
    });
    d.register(routes);

    const res = await d.fetch(
      new Request('http://localhost/root.file?input={"filename":"a.bin"}', {
        method: 'POST',
        body: new Uint8Array([1, 2, 3, 4])
      })
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('a.bin:4');

    const invalidRes = await d.fetch(
      new Request('http://localhost/root.file', { method: 'POST', body: new Uint8Array([1]) })
    );
    expect(invalidRes.status).toBe(400);
  });
  it('should return 405 when calling upload endpoint with GET', async () => {
    const routes = d.routes({
      file: d.endpointBuilder.upload(() => 'data')
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.file'));
    expect(res.status).toBe(405);
  });
  it('should handle invalid JSON in query parameter for upload endpoints', async () => {
    const routes = d.routes({
      file: d.endpointBuilder.upload(({ input }) => JSON.stringify(input))
    });
    d.register(routes);

    const res = await d.fetch(
      new Request('http://localhost/root.file?input={invalid-json}', { method: 'POST', body: new Uint8Array([1]) })
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { message: string };
    expect(json.message).toBe('Invalid JSON in input query parameter');
  });
});
