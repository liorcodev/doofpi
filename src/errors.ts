import type z from 'zod';

export type ErrorShape = {
  message: string;
  status: number;
  issues?: z.core.$ZodIssue[];
  error?: unknown;
  details?: unknown;
};

/**
 * Base error class for all Doofpi server-side errors.
 *
 * @extends Error
 *
 * @example
 * ```ts
 * throw new DoofpiError({
 *   message: 'Custom error',
 *   status: 400,
 *   details: { field: 'email' }
 * });
 * ```
 */
export class DoofpiError extends Error {
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
    this.name = 'DoofpiError';
  }
}

export class NotFoundError extends DoofpiError {
  constructor(message: string = 'Not Found') {
    super({ message, status: 404 });
    this.name = 'NotFoundError';
  }
}

export class MethodNotAllowedError extends DoofpiError {
  constructor(message: string = 'Method Not Allowed') {
    super({ message, status: 405 });
    this.name = 'MethodNotAllowedError';
  }
}

export class ValidationError extends DoofpiError {
  constructor(options: { message?: string; issues: z.core.$ZodIssue[] }) {
    super({ message: options.message ?? 'Validation Error', status: 400, issues: options.issues });
    this.name = 'ValidationError';
  }
}

export class InternalServerError extends DoofpiError {
  constructor(options: { message?: string; error?: unknown }) {
    super({ message: options.message ?? 'Internal Server Error', status: 500, error: options.error });
    this.name = 'InternalServerError';
  }
}
