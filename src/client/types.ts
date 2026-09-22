import type { Routes, Endpoint, EndpointDefinition, InferZodType } from '../types';
import type { BodyInit } from 'bun';

export type Client<R extends Routes> = {
  [K in keyof R]: R[K] extends Endpoint<infer E>
    ? E extends EndpointDefinition<infer Model>
      ? E extends Required<Pick<EndpointDefinition<Model>, 'read'>>
        ? InferZodType<Model['input']> extends never
          ? { read: (input?: undefined, init?: ClientRequestInit) => Promise<InferZodType<Model['output']>> }
          : {
              read: (
                input: InferZodType<Model['input']>,
                init?: ClientRequestInit
              ) => Promise<InferZodType<Model['output']>>;
            }
        : E extends Required<Pick<EndpointDefinition<Model>, 'write'>>
          ? InferZodType<Model['input']> extends never
            ? { write: (input?: undefined, init?: ClientRequestInit) => Promise<InferZodType<Model['output']>> }
            : {
                write: (
                  input: InferZodType<Model['input']>,
                  init?: ClientRequestInit
                ) => Promise<InferZodType<Model['output']>>;
              }
          : E extends Required<Pick<EndpointDefinition<Model>, 'download'>>
            ? InferZodType<Model['input']> extends never
              ? { download: (input?: undefined, init?: ClientRequestInit) => Promise<Response> }
              : { download: (input: InferZodType<Model['input']>, init?: ClientRequestInit) => Promise<Response> }
            : E extends Required<Pick<EndpointDefinition<Model>, 'upload'>>
              ? InferZodType<Model['input']> extends never
                ? { upload: (input: undefined, body: BodyInit, init?: ClientRequestInit) => Promise<Response> }
                : {
                    upload: (
                      input: InferZodType<Model['input']>,
                      body: BodyInit,
                      init?: ClientRequestInit
                    ) => Promise<Response>;
                  }
              : never
      : never
    : R[K] extends Routes
      ? Client<R[K]>
      : never;
};

export type ClientRequestInit = Pick<RequestInit, 'cache' | 'signal' | 'credentials'> & {
  headers?: Record<string, string>;
};
