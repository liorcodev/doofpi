# Changelog

## 1.2.0 (2026-10-06)

### Features

- **Cloudflare Email Routing** - New `onEmail(handler)` hook and `email(message, env, extra)` method on `Doofpi` for
  handling incoming Cloudflare Email Routing messages. Export it as the Worker's `email` handler, separate from `fetch`.
  The handler receives `{ message, env, extra }`; `@cloudflare/workers-types` is an optional peer dependency used for
  the `ForwardableEmailMessage` type

## 1.1.0 (2026-09-22)

### Features

- **Download Endpoints** - New `.download(handler)` method on the endpoint builder (`GET`) for returning raw
  `Response`/`BodyInit` (files, bytes, etc.) that bypasses JSON serialization and `model.output` validation entirely.
  Works with or without a `model.input` schema. Client's `.download()` method always resolves to the raw `Response`
  object, never JSON-parsed
- **Upload Endpoints** - New `.upload(handler)` method on the endpoint builder (`POST`), the write-side twin of
  `download`. The request body is left completely untouched so the handler can read it raw (e.g. via
  `req.arrayBuffer()`), while `input` (if a `model.input` schema is set) is still parsed from the query string like a
  `read`/`download` endpoint. Client's `.upload(input, body, init?)` sends `body` as the raw request payload and
  resolves to the raw, never-JSON-parsed `Response`

## 1.0.0 (2026-03-27)

### Features

- **Core Framework** - `Doofpi` class with full request lifecycle: `createContext`, `onRequest`, `onResponse`, `onError`
  hooks
- **Endpoint Builder** - Fluent API for defining endpoints with `model()`, `meta()`, `middleware()`, `read()`, and
  `write()` methods
- **Read & Write Operations** - `GET`-based reads (input via query parameter) and `POST`-based writes (input via JSON
  body)
- **Zod Validation** - Input and output schema validation using Zod, with automatic error extraction
- **Middleware** - Per-endpoint middleware chains with access to request context, meta, and `throwError`
- **Default Meta** - `defaultMeta()` on the endpoint builder for shared metadata across endpoints
- **Routing** - Dot-notation path routing powered by `extreme-router`, with configurable root (default: `/doofpi`)
- **Type-Safe Client** - `createClient<Routes>()` proxy-based client that mirrors the server route structure with full
  type inference
- **Error System** - `DoofpiError`, `NotFoundError`, `MethodNotAllowedError`, `ValidationError`, `InternalServerError`
  on the server; `DoofpiClientError` on the client
- **Environment & Context** - `defineEnv()`, `defineExtra()`, `defineMeta()` for typed environment, extra bindings, and
  metadata
- **`InferContext` Utility** - Type helper to extract the context type from a `Doofpi` instance
- **Web Standards** - Built on the `Request`/`Response` API - runs on Bun, Cloudflare Workers, Vercel, Netlify Edge
  Functions, Deno and more
