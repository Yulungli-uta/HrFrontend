type LogLevel = "none" | "error" | "info" | "debug";

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  showTimings: boolean;
  maxBodyLength: number;
  debugAuth: boolean;
  debugApi: boolean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  none: 0,
  error: 1,
  info: 2,
  debug: 3,
};

function getConfig(): LoggerConfig {
  return {
    enabled: import.meta.env.VITE_API_LOGGING === "true",
    level: (import.meta.env.VITE_API_LOG_LEVEL as LogLevel) || "error",
    showTimings: import.meta.env.VITE_API_LOG_TIMINGS === "true",
    maxBodyLength: parseInt(import.meta.env.VITE_API_LOG_MAX_BODY || "500", 10),
    debugAuth: import.meta.env.VITE_DEBUG_AUTH === "true",
    debugApi: import.meta.env.VITE_API_DEBUG === "true",
  };
}

function shouldLog(targetLevel: LogLevel): boolean {
  const config = getConfig();
  if (!config.enabled) return false;
  return LOG_LEVEL_PRIORITY[config.level] >= LOG_LEVEL_PRIORITY[targetLevel];
}

function truncateBody(body: unknown): string {
  const config = getConfig();
  if (body === undefined || body === null) return "";
  const str = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  if (str.length > config.maxBodyLength) {
    return str.substring(0, config.maxBodyLength) + `... [truncado, ${str.length} chars total]`;
  }
  return str;
}

function formatTimestamp(): string {
  return new Date().toISOString().substring(11, 23);
}

function createPrefix(module: string, level: LogLevel): string {
  const time = formatTimestamp();
  const levelTag = level.toUpperCase().padEnd(5);
  return `[${time}] [${levelTag}] [${module}]`;
}

export const logger = {
  error(module: string, message: string, ...args: unknown[]) {
    if (!shouldLog("error")) return;
    console.error(`${createPrefix(module, "error")} ${message}`, ...args);
  },

  info(module: string, message: string, ...args: unknown[]) {
    if (!shouldLog("info")) return;
    console.info(`${createPrefix(module, "info")} ${message}`, ...args);
  },

  debug(module: string, message: string, ...args: unknown[]) {
    if (!shouldLog("debug")) return;
    console.debug(`${createPrefix(module, "debug")} ${message}`, ...args);
  },

  warn(module: string, message: string, ...args: unknown[]) {
    if (!shouldLog("info")) return;
    console.warn(`${createPrefix(module, "info")} ${message}`, ...args);
  },

  api: {
    request(method: string, url: string, body?: unknown) {
      const config = getConfig();
      if (!config.debugApi && !shouldLog("debug")) return;
      const prefix = createPrefix("API", "debug");
      const bodyStr = body ? `\n  Body: ${truncateBody(body)}` : "";
      console.debug(`${prefix} --> ${method} ${url}${bodyStr}`);
    },

    response(method: string, url: string, status: number, durationMs?: number) {
      const config = getConfig();
      const isError = status >= 400;
      if (isError && !shouldLog("error")) return;
      if (!isError && !config.debugApi && !shouldLog("debug")) return;

      const level: LogLevel = isError ? "error" : "debug";
      const prefix = createPrefix("API", level);
      const timing = config.showTimings && durationMs !== undefined ? ` (${durationMs}ms)` : "";
      const logFn = isError ? console.error : console.debug;
      logFn(`${prefix} <-- ${status} ${method} ${url}${timing}`);
    },

    error(method: string, url: string, error: unknown, durationMs?: number) {
      if (!shouldLog("error")) return;
      const config = getConfig();
      const prefix = createPrefix("API", "error");
      const timing = config.showTimings && durationMs !== undefined ? ` (${durationMs}ms)` : "";
      console.error(`${prefix} !!! ${method} ${url}${timing}`, error);
    },
  },

  auth: {
    debug(message: string, ...args: unknown[]) {
      const config = getConfig();
      if (!config.debugAuth) return;
      console.debug(`${createPrefix("AUTH", "debug")} ${message}`, ...args);
    },

    info(message: string, ...args: unknown[]) {
      const config = getConfig();
      if (!config.debugAuth) return;
      console.info(`${createPrefix("AUTH", "info")} ${message}`, ...args);
    },

    error(message: string, ...args: unknown[]) {
      console.error(`${createPrefix("AUTH", "error")} ${message}`, ...args);
    },

    warn(message: string, ...args: unknown[]) {
      const config = getConfig();
      if (!config.debugAuth) return;
      console.warn(`${createPrefix("AUTH", "info")} ${message}`, ...args);
    },
  },

  getConfig,
};
