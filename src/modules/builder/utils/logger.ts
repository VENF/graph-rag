type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
  stack?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function writeLog(entry: LogEntry): void {
  const parts: string[] = [`[${entry.timestamp}]`, `[${entry.level.toUpperCase()}]`, entry.message];
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }
  if (entry.error) {
    parts.push(`error=${entry.error}`);
  }

  const output = parts.join(' ');

  if (entry.level === 'error') {
    process.stderr.write(output + '\n');
    if (entry.stack) {
      process.stderr.write(entry.stack + '\n');
    }
  } else if (entry.level === 'warn') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (!shouldLog('debug')) return;
    writeLog({ timestamp: formatTimestamp(), level: 'debug', message, context });
  },

  info(message: string, context?: Record<string, unknown>): void {
    if (!shouldLog('info')) return;
    writeLog({ timestamp: formatTimestamp(), level: 'info', message, context });
  },

  warn(message: string, context?: Record<string, unknown>): void {
    if (!shouldLog('warn')) return;
    writeLog({ timestamp: formatTimestamp(), level: 'warn', message, context });
  },

  error(message: string, err?: unknown, context?: Record<string, unknown>): void {
    if (!shouldLog('error')) return;
    const errorObj = err instanceof Error ? err : undefined;
    writeLog({
      timestamp: formatTimestamp(),
      level: 'error',
      message,
      context,
      error: errorObj?.message || String(err || ''),
      stack: errorObj?.stack,
    });
  },
};
