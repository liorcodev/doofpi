import { beforeEach, describe, expect, it } from 'vitest';
import Doofpi from '../index';

describe('Meta Test', () => {
  let d: Doofpi<any, any, any, any>;
  beforeEach(() => {
    d = new Doofpi({ root: '/root' });
  });

  it('should define default meta', async () => {
    const endpointBuilder = d.endpointBuilder.defaultMeta({ foo: 'bar' });
    const routes = d.routes({
      home: endpointBuilder.read(({ meta }) => meta?.foo),
      some: endpointBuilder.read(({ meta }) => meta?.foo)
    });
    d.register(routes);

    let res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('bar');

    res = await d.fetch(new Request('http://localhost/root.some'));
    expect(res.status).toBe(200);
    const textSome = await res.text();
    expect(textSome).toBe('bar');
  });
  it('should define meta', async () => {
    const routes = d.routes({
      home: d.endpointBuilder.meta({ foo: 'baz' }).read(({ meta }) => meta?.foo)
    });
    d.register(routes);

    const res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('baz');
  });
  it('should override default meta for a specific routes', async () => {
    const endpointBuilder = d.endpointBuilder.defaultMeta({ foo: 'bar' });
    const routes = d.routes({
      home: endpointBuilder.meta({ foo: 'baz' }).read(({ meta }) => meta?.foo),
      some: endpointBuilder.read(({ meta }) => meta?.foo)
    });
    d.register(routes);

    let res = await d.fetch(new Request('http://localhost/root.home'));
    expect(res.status).toBe(200);
    let text = await res.text();
    expect(text).toBe('baz');

    res = await d.fetch(new Request('http://localhost/root.some'));
    expect(res.status).toBe(200);
    text = await res.text();
    expect(text).toBe('bar');
  });

  it('should allow redefining default meta from an existing endpoint builder', async () => {
    const baseBuilder = d.endpointBuilder.defaultMeta({ foo: 'base' });
    const overriddenBuilder = baseBuilder.defaultMeta({ foo: 'override' });

    const routes = d.routes({
      base: baseBuilder.read(({ meta }) => meta?.foo),
      overridden: overriddenBuilder.read(({ meta }) => meta?.foo)
    });
    d.register(routes);

    let res = await d.fetch(new Request('http://localhost/root.base'));
    expect(res.status).toBe(200);
    let text = await res.text();
    expect(text).toBe('base');

    res = await d.fetch(new Request('http://localhost/root.overridden'));
    expect(res.status).toBe(200);
    text = await res.text();
    expect(text).toBe('override');
  });
});
