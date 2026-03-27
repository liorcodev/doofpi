# Changelog

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
