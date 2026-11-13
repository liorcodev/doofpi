import Doofpi from './src/doofpi';
import type { InferContext } from './src/doofpi';
import type { MiddlewareHandler } from './src/types';
import { DoofpiError } from './src/errors';

import { createClient } from './src/client/client';
import { DoofpiClientError } from './src/client/error';
import type { ClientFetch } from './src/client/types';

export default Doofpi;
export type { InferContext, MiddlewareHandler, ClientFetch };
export { DoofpiError, createClient, DoofpiClientError };
