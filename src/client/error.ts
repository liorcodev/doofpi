import type z from 'zod';
import type { ErrorShape } from '../errors';

/**
 * Client-side error class for Doofpi client errors.
 *
 * @extends Error
 *
 * @example
 * ```ts
 * try {
 *   await client.users.get.read({ id: '123' });
 * } catch (error) {
 *   if (error instanceof DoofpiClientError) {
 *     console.error(`Status: ${error.status}`);
 *   }
 * }
 * ```
 */
export class DoofpiClientError extends Error {
  status: number;
  issues?: z.core.$ZodIssue[];
  error?: unknown;
  details?: unknown;
  constructor(options: ErrorShape) {
    super(options.message);
    this.status = options.status;
    this.issues = options.issues;
    this.error = options.error;
    this.details = options.details;
    this.name = 'DoofpiClientError';
  }
}
