/**
 * Vendor-neutral logger interface.
 *
 * The federation runtime plugin, the QueryClient error handler, and the root
 * error boundary all call into this. Default implementation writes to
 * `console`; swap in a Sentry / Datadog / PostHog adapter via `setLogger`
 * once you've picked a backend.
 *
 * Why an interface and not "just import Sentry":
 *   - Decouples the template from any specific observability vendor.
 *   - Lets tests assert on logged events without touching the network.
 *   - Lets you bundle the template without an observability dep until
 *     you're ready to commit.
 *
 * The interface is intentionally narrow — `debug` / `info` / `warn` /
 * `error` plus structured `event` for non-error tracking. Add fields, not
 * methods.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export type LogEvent = {
  /** Stable name, e.g. 'remote.load.failed', 'query.error'. Use dotted scopes. */
  name: string;
  level: LogLevel;
  message?: string;
  context?: LogContext;
  error?: unknown;
};

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
  /** Structured event — preferred for production observability backends. */
  event(event: LogEvent): void;
}

const consoleLogger: Logger = {
  debug(message, context) {
    console.debug(message, context ?? '');
  },
  info(message, context) {
    console.info(message, context ?? '');
  },
  warn(message, context) {
    console.warn(message, context ?? '');
  },
  error(message, error, context) {
    console.error(message, error, context ?? '');
  },
  event({ name, level, message, context, error }) {
    const payload = { name, ...context, ...(error ? { error } : {}) };
    const text = message ?? name;
    switch (level) {
      case 'debug':
        console.debug(text, payload);
        break;
      case 'info':
        console.info(text, payload);
        break;
      case 'warn':
        console.warn(text, payload);
        break;
      case 'error':
        console.error(text, payload);
        break;
    }
  },
};

let activeLogger: Logger = consoleLogger;

/**
 * Replace the active logger. Call once at bootstrap if you wire a backend.
 * Subsequent calls override — useful in tests for assertion capture.
 */
export function setLogger(impl: Logger): void {
  activeLogger = impl;
}

/**
 * Restore the default console logger. Useful in test teardown.
 */
export function resetLogger(): void {
  activeLogger = consoleLogger;
}

/**
 * The currently-active logger. Accessed lazily so swaps via `setLogger` are
 * visible to existing call sites without re-importing.
 */
export const logger: Logger = {
  debug: (...args) => activeLogger.debug(...args),
  info: (...args) => activeLogger.info(...args),
  warn: (...args) => activeLogger.warn(...args),
  error: (...args) => activeLogger.error(...args),
  event: (event) => activeLogger.event(event),
};
