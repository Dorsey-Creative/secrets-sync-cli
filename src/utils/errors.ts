/**
 * Error Handling Classes
 * 
 * Provides structured error types with context for actionable error messages.
 * All errors extend AppError to maintain consistent structure.
 */

/**
 * Base error class for all application errors.
 * Provides context support for detailed error information.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a required dependency is missing.
 * Includes installation information to help users resolve the issue.
 */
export class DependencyError extends AppError {
  constructor(
    public readonly dependency: string,
    public readonly installUrl: string,
    public readonly installCommand?: string
  ) {
    super(`Missing dependency: ${dependency}`);
  }
}

/**
 * Error thrown when a file operation fails due to insufficient permissions.
 * Includes the fix command to help users resolve the issue.
 */
export class PermissionError extends AppError {
  constructor(
    public readonly path: string,
    public readonly operation: 'read' | 'write',
    public readonly fixCommand: string
  ) {
    super(`Permission denied: cannot ${operation} ${path}`);
  }
}

/**
 * Error thrown when an operation exceeds the timeout limit.
 * Includes duration information for debugging.
 */
export class TimeoutError extends AppError {
  constructor(
    public readonly operation: string,
    public readonly timeoutMs: number
  ) {
    super(`Operation timed out after ${timeoutMs}ms: ${operation}`);
  }
}

/**
 * Error thrown when validation fails.
 * Includes field information for specific validation errors.
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
  }
}
