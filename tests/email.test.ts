import { describe, expect, it, vi } from 'vitest';
import type { ForwardableEmailMessage } from '@cloudflare/workers-types';
import Doofpi from '../index';

const message = { from: 'a@example.com', to: 'b@example.com' } as unknown as ForwardableEmailMessage;

describe('Cloudflare Email', () => {
  it('should call onEmail with message, env and extra', async () => {
    const handler = vi.fn();
    const d = new Doofpi({ root: '/root' }).onEmail(handler);

    await d.email(message, { KEY: 'v' } as never, { waitUntil: 1 } as never);

    expect(handler).toHaveBeenCalledWith({ message, env: { KEY: 'v' }, extra: { waitUntil: 1 } });
  });
  it('should await an async handler', async () => {
    let done = false;
    const d = new Doofpi({ root: '/root' }).onEmail(async () => {
      await Promise.resolve();
      done = true;
    });

    await d.email(message);

    expect(done).toBe(true);
  });
  it('should do nothing when no handler is defined', async () => {
    const d = new Doofpi({ root: '/root' });
    await expect(d.email(message)).resolves.toBeUndefined();
  });
  it('should throw when onEmail is defined twice', () => {
    const d = new Doofpi({ root: '/root' }).onEmail(() => {});
    expect(() => d.onEmail(() => {})).toThrow('onEmail handler is already defined');
  });
  it('should not route emails through fetch', async () => {
    const handler = vi.fn();
    const d = new Doofpi({ root: '/root' }).onEmail(handler);

    const res = await d.fetch(new Request('http://localhost/root.home'));

    expect(res.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });
});
