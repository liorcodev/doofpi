<div align="center">
  <br/>
  <img src="./assets/logo.svg" alt="doofpi" width="80" />
  <h1>doofpi</h1>
  <p><strong>Edge-First TypeScript API Framework</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/doofpi"><img src="https://img.shields.io/npm/v/doofpi.svg" alt="npm version" /></a>
    &nbsp;
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-orange.svg" alt="MIT License" /></a>
  </p>

  <p>
    <a href="https://liorcodev.github.io/doofpi-docs/docs/quick-start"><strong>Quick Start</strong></a> ·
    <a href="https://liorcodev.github.io/doofpi-docs/docs/core-concepts/read-and-write"><strong>Core Concepts</strong></a> ·
    <a href="https://liorcodev.github.io/doofpi-docs/docs/api-reference/doofpi-class"><strong>API Reference</strong></a> ·
    <a href="https://liorcodev.github.io/doofpi-docs"><strong>Documentation →</strong></a>
  </p>
  <br/>
</div>

---

**doofpi** is a lightweight TypeScript framework based on web standards for building end-to-end type-safe APIs - no code
generation, no build steps, no separate schema files to maintain

```bash
# Core install
bun install doofpi

npm install doofpi

pnpm install doofpi
```

> **Optional:** Add `zod` for schema validation and type inference from schemas.
>
> ```bash
> bun install doofpi zod
> ```

## Highlights

|                            |                                                             |
| -------------------------- | ----------------------------------------------------------- |
| **Zero Boilerplate**       | No adapters, links, or transformers minimal setup           |
| **End-to-End Type Safety** | Change your server, your client breaks at compile time      |
| **Runtime Agnostic**       | Bun · Cloudflare Workers · Vercel · Netlify · Deno and more |
| **Zod Validation**         | Optional input _and_ output validation at runtime           |
| **Web Standards**          | Built on the native `Request` / `Response` API              |
| **Thoroughly Tested**      | 100% code coverage across all core features                 |

## Documentation

Full documentation, guides, and API reference are available at
**[liorcodev.github.io/doofpi-docs](https://liorcodev.github.io/doofpi-docs)**.

|                                                                                            |                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [Quick Start](https://liorcodev.github.io/doofpi-docs/docs/quick-start)                    | Get up and running in minutes                                |
| [Core Concepts](https://liorcodev.github.io/doofpi-docs/docs/core-concepts/read-and-write) | Read & Write semantics, routing, Zod validation              |
| [Guides](https://liorcodev.github.io/doofpi-docs/docs/guides/context-and-middleware)       | Context, middleware, error handling, and more                |
| [API Reference](https://liorcodev.github.io/doofpi-docs/docs/api-reference/doofpi-class)   | Full API for `Doofpi`, `EndpointBuilder`, and `createClient` |
| [Comparison](https://liorcodev.github.io/doofpi-docs/docs/comparison)                      | How doofpi compares to tRPC                                  |

## Acknowledgments

Inspired by [tRPC](https://trpc.io).

---

<div align="center">
  <sub>MIT License · Built with ❤️ for the TypeScript community</sub>
</div>
