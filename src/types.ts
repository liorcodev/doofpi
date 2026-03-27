import type z from 'zod';
import type { ErrorShape } from './errors';

export type InferZodType<T, Default = never> = [T] extends [z.ZodTypeAny] ? z.infer<T> : Default;

export type ModelDefinition = {
  input?: z.ZodTypeAny;
  output?: z.ZodTypeAny;
};

export type MetaDefinition = object;

export type EnvDefinition = object;

export type ExtraDefinition = object;

export type CtxDefinition = object;

export type OnRequestHandlerOptions<
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = {
  req: Request;
  url: URL;
  path: string;
  env: Env;
  ctx: Ctx;
  extra: Extra;
  headers: Headers;
  throwError: (options: ErrorShape) => never;
};

export type OnRequestHandler<
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = (options: OnRequestHandlerOptions<Env, Ctx, Extra>) => Promise<void> | void;

export type OnResponseHandlerOptions<
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = {
  req: Request;
  res: Response;
  env: Env;
  ctx: Ctx;
  extra: Extra;
};

export type OnResponseHandler<
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = (options: OnResponseHandlerOptions<Env, Ctx, Extra>) => Promise<void> | void;

export type OnErrorHandlerOptions<
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = {
  req: Request;
  url: URL;
  path: string;
  headers: Headers;
  env: Env;
  ctx: Ctx;
  extra: Extra;
  error: ErrorShape;
};

export type OnErrorHandler<
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = (options: OnErrorHandlerOptions<Env, Ctx, Extra>) => Promise<void | ErrorShape> | void | ErrorShape;

export type CreateContextOptions<
  Env extends EnvDefinition = EnvDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = {
  req: Request;
  url: URL;
  path: string;
  env: Env;
  extra: Extra;
};

export type CreateContextHandler<
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = (options: CreateContextOptions<Env, Extra>) => Promise<Ctx> | Ctx;

export type EndpointHandlerOptions<
  Input,
  Meta extends MetaDefinition = MetaDefinition,
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = {
  req: Request;
  url: URL;
  path: string;
  input: InferZodType<Input, object>;
  env: Env;
  ctx: Ctx;
  extra: Extra;
  meta?: Meta;
  headers: Headers;
  throwError: (options: ErrorShape) => never;
};

export type EndpointHandler<
  Model extends ModelDefinition = ModelDefinition,
  Meta extends MetaDefinition = MetaDefinition,
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = (
  options: EndpointHandlerOptions<Model['input'], Meta, Env, Ctx, Extra>
) => Promise<InferZodType<Model['output'], unknown>> | InferZodType<Model['output'], unknown>;

export type MiddlewareHandlerOptions<
  Meta extends MetaDefinition = MetaDefinition,
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = {
  req: Request;
  url: URL;
  path: string;
  meta?: Meta;
  env: Env;
  ctx: Ctx;
  extra: Extra;
  headers: Headers;
  throwError: (options: ErrorShape) => never;
};

export type MiddlewareHandler<
  Meta extends MetaDefinition = MetaDefinition,
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = (options: MiddlewareHandlerOptions<Meta, Env, Ctx, Extra>) => Promise<void | never> | void | never;

export type EndpointDefinition<
  Model extends ModelDefinition = ModelDefinition,
  Meta extends MetaDefinition = MetaDefinition,
  Env extends EnvDefinition = EnvDefinition,
  Ctx extends CtxDefinition = CtxDefinition,
  Extra extends ExtraDefinition = ExtraDefinition
> = {
  model?: Model;
  read?: EndpointHandler<Model, Meta, Env, Ctx, Extra>;
  write?: EndpointHandler<Model, Meta, Env, Ctx, Extra>;
  middleware?: MiddlewareHandler<Meta, Env, Ctx, Extra>[];
  meta?: Meta;
};

export declare class Endpoint<E extends EndpointDefinition = EndpointDefinition> {
  declare private _definition: E;
}

export type Routes = {
  [key: string]: Endpoint | Routes;
};

export type Options = {
  root: string;
};
