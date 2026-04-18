/**
 * @chordjs/logger — Premium structured logging for Chord.js
 *
 * Features:
 * - Colored terminal output with ANSI escape codes
 * - Log levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
 * - Timestamps and scoped logger names
 * - Pluggable transports (console, file, external)
 */

// ─── ANSI Color Codes ───────────────────────────────────────────────
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const COLORS = {
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
} as const;

// ─── Log Levels ─────────────────────────────────────────────────────
export enum LogLevel {
  TRACE = 0,
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
  FATAL = 50,
  SILENT = 100,
}

const LEVEL_CONFIG: Record<LogLevel, { label: string; color: string; badge: string }> = {
  [LogLevel.TRACE]: { label: "TRACE", color: COLORS.gray, badge: "🔍" },
  [LogLevel.DEBUG]: { label: "DEBUG", color: COLORS.cyan, badge: "🐛" },
  [LogLevel.INFO]:  { label: " INFO", color: COLORS.green, badge: "✨" },
  [LogLevel.WARN]:  { label: " WARN", color: COLORS.yellow, badge: "⚠️" },
  [LogLevel.ERROR]: { label: "ERROR", color: COLORS.red, badge: "❌" },
  [LogLevel.FATAL]: { label: "FATAL", color: `${COLORS.bgRed}${COLORS.white}`, badge: "💀" },
  [LogLevel.SILENT]: { label: "", color: "", badge: "" },
};

// ─── Transport Interface ────────────────────────────────────────────
export interface LogEntry {
  level: LogLevel;
  message: string;
  args: unknown[];
  timestamp: Date;
  scope?: string;
}

export interface LogTransport {
  write(entry: LogEntry): void | Promise<void>;
}

// ─── Console Transport ──────────────────────────────────────────────
export class ConsoleTransport implements LogTransport {
  write(entry: LogEntry): void {
    const config = LEVEL_CONFIG[entry.level];
    if (!config) return;

    const time = this.#formatTime(entry.timestamp);
    const scope = entry.scope ? `${DIM}[${entry.scope}]${RESET} ` : "";
    const levelTag = `${config.color}${BOLD}${config.label}${RESET}`;
    const prefix = `${COLORS.gray}${time}${RESET} ${config.badge} ${levelTag} ${scope}`;

    if (entry.level >= LogLevel.ERROR) {
      console.error(prefix + entry.message, ...entry.args);
    } else if (entry.level >= LogLevel.WARN) {
      console.warn(prefix + entry.message, ...entry.args);
    } else if (entry.level >= LogLevel.DEBUG) {
      console.debug(prefix + entry.message, ...entry.args);
    } else {
      console.log(prefix + entry.message, ...entry.args);
    }
  }

  #formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padStart(3, "0");
    return `${h}:${m}:${s}.${ms}`;
  }
}

// ─── Logger ─────────────────────────────────────────────────────────
export interface LoggerOptions {
  level?: LogLevel;
  scope?: string;
  transports?: LogTransport[];
}

export class Logger {
  public level: LogLevel;
  public readonly scope?: string;
  readonly #transports: LogTransport[];

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.scope = options.scope;
    this.#transports = options.transports ?? [new ConsoleTransport()];
  }

  /** Create a child logger with a specific scope */
  child(scope: string): Logger {
    return new Logger({
      level: this.level,
      scope: this.scope ? `${this.scope}:${scope}` : scope,
      transports: this.#transports,
    });
  }

  trace(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.TRACE, message, args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.DEBUG, message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.INFO, message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.WARN, message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.ERROR, message, args);
  }

  fatal(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.FATAL, message, args);
  }

  addTransport(transport: LogTransport): void {
    this.#transports.push(transport);
  }

  #log(level: LogLevel, message: string, args: unknown[]): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      message,
      args,
      timestamp: new Date(),
      scope: this.scope,
    };

    for (const transport of this.#transports) {
      transport.write(entry);
    }
  }
}

/** Convenience: create a root logger with default console output */
export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}
