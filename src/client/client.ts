import type { ErrorShape } from '../errors';
import type { Routes } from '../types';
import { DoofpiClientError } from './error';
import type { Client, ClientRequestInit } from './types';
import type { BodyInit } from 'bun';

const clientFetch = async (options: {
  url: string;
  path: string;
  method: 'read' | 'write' | 'download' | 'upload';
  init?: ClientRequestInit;
  input?: unknown;
  body?: BodyInit;
}) => {
  const { url, path, method, input, init, body } = options;
  const headers = new Headers(init?.headers);

  if (input && method === 'write') {
    headers.set('Content-Type', 'application/json');
  }
  const finalPath = input && method !== 'write' ? `${path}?input=${encodeURIComponent(JSON.stringify(input))}` : path;
  const isPost = method === 'write' || method === 'upload';
  const finalBody = method === 'write' ? JSON.stringify(input) : method === 'upload' ? body : undefined;
  const response = await fetch(url + finalPath, {
    method: isPost ? 'POST' : 'GET',
    headers,
    body: finalBody,
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
  // Download/upload responses are returned as-is so the caller can read the raw file/bytes
  if (method === 'download' || method === 'upload') {
    return response;
  }
  const contentType = response.headers.get('Content-Type') || '';
  const mediaType = contentType.split(';')[0]?.trim().toLowerCase() || '';
  const hasBody = mediaType === 'application/json' || mediaType.startsWith('text/');
  if (!hasBody) {
    return null;
  }
  const isBodyObject = mediaType === 'application/json';
  const body2 = isBodyObject
    ? await response
        .json()
        .then(body => body)
        .catch(() => null)
    : await response
        .text()
        .then(body => body)
        .catch(() => null);
  if (body2 === null) {
    throw new DoofpiClientError({ message: 'Failed to parse response body', status: response.status });
  }
  return body2;
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
        if (prop === 'read' || prop === 'write' || prop === 'download') {
          return (input?: unknown, init?: ClientRequestInit) =>
            clientFetch({
              url,
              path,
              method: prop as 'read' | 'write' | 'download',
              init: { ...options.init, ...init },
              input
            });
        }
        if (prop === 'upload') {
          return (input: unknown, body: BodyInit, init?: ClientRequestInit) =>
            clientFetch({
              url,
              path,
              method: 'upload',
              init: { ...options.init, ...init },
              input,
              body
            });
        }
        const newPath = path + '.' + prop;
        return proxy(newPath);
      }
    });
  };
  return proxy() as Client<R>;
};
