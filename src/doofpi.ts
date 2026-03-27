import type {
  CreateContextHandler,
  CtxDefinition,
  Endpoint,
  EndpointDefinition,
  EndpointHandler,
  EnvDefinition,
  ExtraDefinition,
  MetaDefinition,
  MiddlewareHandler,
  ModelDefinition,
  OnErrorHandler,
  OnRequestHandler,
  OnResponseHandler,
  Options,
  Routes
} from './types';
import Extreme from 'extreme-router';
import {
  DoofpiError,
  InternalServerError,
  MethodNotAllowedError,
  NotFoundError,
  ValidationError,
  type ErrorShape
} from './errors';
import type { BodyInit } from 'bun';

class EndpointBuilder<
  Model extends ModelDefinition = ModelDefinition,
  Meta extends MetaDefinition = MetaDefinition,
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> {
  private endpointDefinition: EndpointDefinition<Model, Meta, Env, Ctx, Extra> = Object.create(null);
  private _defaultMeta: Meta | undefined = undefined;

  private build() {
    const endpointDefinitionShallowCopy = { ...this.endpointDefinition };
    this.endpointDefinition = Object.create(null);
    this.endpointDefinition.middleware = endpointDefinitionShallowCopy.middleware;
    if (this._defaultMeta)
      endpointDefinitionShallowCopy.meta = { ...this._defaultMeta, ...endpointDefinitionShallowCopy.meta };
    return endpointDefinitionShallowCopy;
  }
  defaultMeta(meta: Meta): EndpointBuilder<Model, Meta, Env, Ctx, Extra> {
    if (this._defaultMeta) {
      const eb = new EndpointBuilder<Model, Meta, Env, Ctx, Extra>();
      eb.endpointDefinition = { ...this.endpointDefinition };
      eb._defaultMeta = meta;
      return eb;
    }
    this._defaultMeta = meta;
    return this;
  }
  middleware(fn: MiddlewareHandler<Meta, Env, Ctx, Extra>): this {
    if (!this.endpointDefinition.middleware) this.endpointDefinition.middleware = [];
    this.endpointDefinition.middleware.push(fn);
    return this;
  }
  meta(meta: Meta): this {
    this.endpointDefinition.meta = meta;
    return this;
  }
  model<M extends Model>(model: M): EndpointBuilder<M, Meta, Env, Ctx, Extra> {
    this.endpointDefinition.model = model;
    return this as unknown as EndpointBuilder<M, Meta, Env, Ctx, Extra>;
  }
  read(
    fn: EndpointHandler<Model, Meta, Env, Ctx, Extra>
  ): Endpoint<EndpointDefinition<Model> & { read: EndpointHandler<Model> }> {
    this.endpointDefinition.read = fn;
    return this.build() as Endpoint<EndpointDefinition<Model> & { read: EndpointHandler<Model> }>;
  }
  write(
    fn: EndpointHandler<Model, Meta, Env, Ctx, Extra>
  ): Endpoint<EndpointDefinition<Model> & { write: EndpointHandler<Model> }> {
    this.endpointDefinition.write = fn;
    return this.build() as Endpoint<EndpointDefinition<Model> & { write: EndpointHandler<Model> }>;
  }
}

export default class Doofpi<
  Meta extends MetaDefinition = MetaDefinition,
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> {
  private router: Extreme<EndpointDefinition> = new Extreme();
  private createContextFn?: CreateContextHandler<Env, Ctx, Extra>;
  private onErrorHandlerFn?: OnErrorHandler<Env, Ctx, Extra>;
  private onRequestHandlerFn?: OnRequestHandler<Env, Ctx, Extra>;
  private onResponseHandlerFn?: OnResponseHandler<Env, Ctx, Extra>;
  private options: Options = { root: '/doofpi' };
  constructor(options?: Partial<Options>) {
    if (options) this.options = { ...this.options, ...options };
  }

  defineEnv<NewEnv extends Env>(): Doofpi<Meta, NewEnv, Ctx, Extra> {
    return this as unknown as Doofpi<Meta, NewEnv, Ctx, Extra>;
  }
  defineExtra<NewExtra extends Extra>(): Doofpi<Meta, Env, Ctx, NewExtra> {
    return this as unknown as Doofpi<Meta, Env, Ctx, NewExtra>;
  }
  defineMeta<NewMeta extends Meta>(): Doofpi<NewMeta, Env, Ctx, Extra> {
    return this as unknown as Doofpi<NewMeta, Env, Ctx, Extra>;
  }
  createContext<NewCtx extends Ctx>(fn: CreateContextHandler<Env, NewCtx, Extra>): Doofpi<Meta, Env, NewCtx, Extra> {
    if (this.createContextFn) {
      throw new Error('createContext handler is already defined');
    }
    this.createContextFn = fn;
    return this as unknown as Doofpi<Meta, Env, NewCtx, Extra>;
  }
  onError(fn: OnErrorHandler<Env, Ctx, Extra>): this {
    if (this.onErrorHandlerFn) {
      throw new Error('onError handler is already defined');
    }
    this.onErrorHandlerFn = fn;
    return this;
  }
  onRequest(fn: OnRequestHandler<Env, Ctx, Extra>): this {
    if (this.onRequestHandlerFn) {
      throw new Error('onRequest handler is already defined');
    }
    this.onRequestHandlerFn = fn;
    return this;
  }
  onResponse(fn: OnResponseHandler<Env, Ctx, Extra>): this {
    if (this.onResponseHandlerFn) {
      throw new Error('onResponse handler is already defined');
    }
    this.onResponseHandlerFn = fn;
    return this;
  }
  get endpointBuilder() {
    return new EndpointBuilder<ModelDefinition, Meta, Env, Ctx, Extra>();
  }
  routes<R extends Routes>(routes: R): R {
    return routes;
  }
  register(routes: Routes): this {
    const traverse = (_routes: Routes, _path: string = this.options.root) => {
      for (const [key, routeOrEndpoint] of Object.entries(_routes)) {
        const path = _path + '.' + key;
        if ('read' in routeOrEndpoint || 'write' in routeOrEndpoint) {
          const endpointDefinition = routeOrEndpoint as EndpointDefinition;
          const routerStore = this.router.register(path);
          routerStore.model = endpointDefinition.model;
          routerStore.read = endpointDefinition.read;
          routerStore.write = endpointDefinition.write;
          routerStore.middleware = endpointDefinition.middleware;
          routerStore.meta = endpointDefinition.meta;
          continue;
        }
        traverse(routeOrEndpoint as Routes, path);
      }
    };
    traverse(routes);
    return this;
  }
  private safeParseJSON(jsonString: string): { success: true; data: unknown } | { success: false; error: unknown } {
    try {
      const data = JSON.parse(jsonString);
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  }
  private async createResponse(
    body: unknown,
    status: number,
    headers: Headers,
    req: Request,
    env: Env,
    ctx: Ctx,
    extra: Extra
  ): Promise<Response> {
    let finalBody = body as BodyInit | null | undefined;
    if (body !== undefined && body !== null) {
      const isBodyObject = typeof body === 'object';
      finalBody = isBodyObject ? JSON.stringify(body) : String(body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', isBodyObject ? 'application/json' : 'text/plain');
      }
    }
    const response = new Response(finalBody, { status, headers });
    if (this.onResponseHandlerFn) {
      await this.onResponseHandlerFn({ res: response, req, env, ctx, extra });
    }
    return response;
  }
  async fetch(req: Request, env: Env = Object.create(null), extra: Extra = Object.create(null)): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toLowerCase();
    const headers = new Headers();
    let ctx: Ctx = Object.create(null);
    const throwError = (options: ErrorShape): never => {
      throw new DoofpiError(options);
    };

    try {
      ctx = this.createContextFn ? await this.createContextFn({ req, url, path, env, extra }) : ctx;

      if (this.onRequestHandlerFn) {
        await this.onRequestHandlerFn({ req, url, path, env, ctx, extra, throwError, headers });
      }

      const match = this.router.match(path);
      // Not Found
      if (!match) throw new NotFoundError();

      // Execute Middleware
      if (match.middleware && match.middleware.length > 0) {
        for (const middlewareFn of match.middleware) {
          await middlewareFn({ req, url, path, meta: match.meta, env, ctx, extra, throwError, headers });
        }
      }

      let output: unknown;

      // Get && Read
      if (method === 'get' && match.read) {
        const inputParam = url.searchParams.get('input');
        let input: unknown;
        if (inputParam) {
          const parseResult = this.safeParseJSON(inputParam);
          if (!parseResult.success)
            throw new DoofpiError({
              message: 'Invalid JSON in input query parameter',
              error: parseResult.error,
              status: 400
            });
          input = parseResult.data;
        } else input = Object.create(null);
        if (match.model?.input) {
          const parseResult = match.model.input.safeParse(input);
          if (!parseResult.success) throw new ValidationError({ issues: parseResult.error.issues });
          input = parseResult.data;
        }
        output = await match.read({
          input: input as object,
          req,
          url,
          path,
          env,
          ctx,
          extra,
          meta: match.meta,
          headers,
          throwError
        });
      }
      // Post && Write
      else if (method === 'post' && match.write) {
        let input: unknown;
        const contentType = req.headers.get('Content-Type') || '';
        const mediaType = contentType.split(';')[0]?.trim().toLowerCase() || '';
        if (mediaType === 'application/json') {
          input = await req
            .json()
            .then(data => data)
            .catch(() => null);
          if (input === null) throw new DoofpiError({ message: 'Invalid JSON in request body', status: 400 });
        } else input = Object.create(null);

        if (match.model?.input) {
          const parseResult = match.model.input.safeParse(input);
          if (!parseResult.success) throw new ValidationError({ issues: parseResult.error.issues });
          input = parseResult.data;
        }
        output = await match.write({
          input: input as object,
          req,
          url,
          path,
          env,
          ctx,
          extra,
          meta: match.meta,
          headers,
          throwError
        });
      }
      // Method Not Allowed
      else {
        throw new MethodNotAllowedError();
      }

      if (match.model?.output) {
        const parseResult = match.model.output.safeParse(output);
        if (!parseResult.success)
          throw new DoofpiError({
            message: 'Internal Server Error',
            issues: parseResult.error.issues,
            error: 'Output validation failed',
            status: 500
          });
        output = parseResult.data;
      }

      return this.createResponse(output, 200, headers, req, env, ctx, extra);
    } catch (unknownError) {
      const error =
        unknownError instanceof DoofpiError ? unknownError : new InternalServerError({ error: unknownError });
      if (this.onErrorHandlerFn) {
        const maybeErrorShape = await this.onErrorHandlerFn({ error, req, url, path, env, ctx, extra, headers });
        if (maybeErrorShape && 'message' in maybeErrorShape && 'status' in maybeErrorShape) {
          const { status, ...errorShape } = maybeErrorShape;
          return this.createResponse(errorShape, status, headers, req, env, ctx, extra);
        }
      }
      const errorShape: Omit<ErrorShape, 'status'> = {
        message: error.message,
        issues: error.issues,
        details: error.details,
        error: error.error
      };
      return this.createResponse(errorShape, error.status, headers, req, env, ctx, extra);
    }
  }
}

export type InferContext<Def extends Doofpi> = Def extends Doofpi<any, any, infer Ctx> ? Ctx : never;
