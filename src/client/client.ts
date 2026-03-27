import type { ErrorShape } from '../errors';
import type { Routes } from '../types';
import { DoofpiClientError } from './error';
import type { Client, ClientRequestInit } from './types';

const clientFetch = async (options: {
  url: string;
  path: string;
  method: 'read' | 'write';
  init?: ClientRequestInit;
  input?: unknown;
}) => {
  const { url, path, method, input, init } = options;
  const headers = new Headers(init?.headers);

  if (input && method === 'write') {
    headers.set('Content-Type', 'application/json');
  }
  const finalPath = input && method === 'read' ? `${path}?input=${encodeURIComponent(JSON.stringify(input))}` : path;
  const response = await fetch(url + finalPath, {
    method: method === 'read' ? 'GET' : 'POST',
    headers,
    body: input && method === 'write' ? JSON.stringify(input) : undefined,
    cache: init?.cache,
    signal: init?.signal,
    credentials: init?.credentials
  });
  if (!response.ok) {
    const errorShape = (await response
      .json()
      .then(body => body)
      .catch(() => null)) as Omit<ErrorShape, 'status'> | null;
    if (errorShape) {
      throw new DoofpiClientError({ ...errorShape, status: response.status });
    }
    throw new DoofpiClientError({ message: `Request failed with status ${response.status}`, status: response.status });
  }
  const contentType = response.headers.get('Content-Type') || '';
  const mediaType = contentType.split(';')[0]?.trim().toLowerCase() || '';
  const hasBody = mediaType === 'application/json' || mediaType.startsWith('text/');
  if (!hasBody) {
    return null;
  }
  const isBodyObject = mediaType === 'application/json';
  const body = isBodyObject
    ? await response
        .json()
        .then(body => body)
        .catch(() => null)
    : await response
        .text()
        .then(body => body)
        .catch(() => null);
  if (body === null) {
    throw new DoofpiClientError({ message: 'Failed to parse response body', status: response.status });
  }
  return body;
};

export const createClient = <R extends Routes>(options: {
  url: string;
  root?: string;
  init?: ClientRequestInit;
}): Client<R> => {
  const { url, root = '/doofpi' } = options;
  const proxy = (path: string = root): Client<R> => {
    return new Proxy(Object.create(null), {
      get(_, prop: string) {
        if (prop === 'read' || prop === 'write') {
          return (input?: unknown, init?: ClientRequestInit) =>
            clientFetch({
              url,
              path,
              method: prop as 'read' | 'write',
              init: { ...options.init, ...init },
              input
            });
        }
        const newPath = path + '.' + prop;
        return proxy(newPath);
      }
    });
  };
  return proxy() as Client<R>;
};
