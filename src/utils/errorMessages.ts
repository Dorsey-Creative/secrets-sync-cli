/**
 * Error Message Builder
 * 
 * Provides consistent, actionable error messages using a centralized catalog.
 * All messages follow the "what, why, how to fix" format.
 * 
 * Security: All error messages are automatically scrubbed to prevent secret leakage.
 */

import errorCatalog from '../messages/errors.json';
import { DependencyError, PermissionError, TimeoutError } from './errors';
import { scrubSecrets, scrubObject } from './scrubber';

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

interface ErrorMessage {
  what: string;
  why: string;
  howToFix: string;
}

type ErrorCode = keyof typeof errorCatalog;

/**
 * Simple template interpolation for {{placeholder}} syntax.
 * Supports conditional sections with {{#key}}...{{/key}} syntax.
 */
function interpolate(template: string, context: Record<string, unknown>): string {
  let result = template;
  
  // Handle conditional sections {{#key}}...{{/key}}
  result = result.replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs, (_, key, content) => {
    return context[key] ? interpolate(content, context) : '';
  });
  
  // Handle simple placeholders {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : '';
  });
  
  return result;
}

/**
 * Load error message from catalog and interpolate context.
 */
export function getMessage(code: ErrorCode, context: Record<string, unknown> = {}): ErrorMessage {
  const template = errorCatalog[code];
  if (!template) {
    throw new Error(`Unknown error code: ${code}`);
  }
  
  return {
    what: interpolate(template.what, context),
    why: interpolate(template.why, context),
    howToFix: interpolate(template.howToFix, context),
  };
}

/**
 * Build a formatted error message with colors.
 * All message fields are automatically scrubbed to prevent secret leakage.
 */
export function buildErrorMessage(msg: ErrorMessage): string {
  const lines = [
    `${colors.red}❌ ${scrubSecrets(msg.what)}${colors.reset}`,
    `   ${scrubSecrets(msg.why)}`,
    `   ${colors.cyan}${scrubSecrets(msg.howToFix)}${colors.reset}`,
  ];
  
  return lines.join('\n');
}

/**
 * Format context object for display.
 * Context is automatically scrubbed to prevent secret leakage.
 */
export function formatContext(context: Record<string, unknown>): string {
  if (Object.keys(context).length === 0) return '';
  
  const scrubbedContext = scrubObject(context);
  return `\n   ${colors.yellow}Context:${colors.reset} ${JSON.stringify(scrubbedContext, null, 2)
    .split('\n')
    .join('\n   ')}`;
}

/**
 * Format a DependencyError into an actionable message.
 */
export function formatDependencyError(error: DependencyError): string {
  const msg = getMessage('ERR_DEPENDENCY_MISSING', {
    dependency: error.dependency,
    installUrl: error.installUrl,
    installCommand: error.installCommand,
  });
  
  return buildErrorMessage(msg);
}

/**
 * Format a PermissionError into an actionable message.
 */
export function formatPermissionError(error: PermissionError): string {
  const code = error.operation === 'read' ? 'ERR_PERMISSION_READ' : 'ERR_PERMISSION_WRITE';
  const msg = getMessage(code, {
    path: error.path,
    fixCommand: error.fixCommand,
  });
  
  return buildErrorMessage(msg);
}

/**
 * Format a TimeoutError into an actionable message.
 */
export function formatTimeoutError(error: TimeoutError): string {
  const timeoutSeconds = Math.round(error.timeoutMs / 1000);
  const suggestedTimeout = error.timeoutMs * 2;
  
  const msg = getMessage('ERR_TIMEOUT', {
    operation: error.operation,
    timeoutSeconds,
    suggestedTimeout,
  });
  
  return buildErrorMessage(msg);
}
