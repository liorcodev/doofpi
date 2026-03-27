import { beforeEach, describe, expect, it } from 'vitest';
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
});
