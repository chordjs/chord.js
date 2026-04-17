export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  None = 4
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  colors?: boolean;
}

export class Logger {
  public level: LogLevel;
  public prefix: string | null;
  public colors: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.Info;
    this.prefix = options.prefix ?? null;
    this.colors = options.colors ?? true;
  }

  debug(...args: any[]): void {
    if (this.level <= LogLevel.Debug) {
      console.debug(this.#format(LogLevel.Debug), ...args);
    }
  }

  info(...args: any[]): void {
    if (this.level <= LogLevel.Info) {
      console.info(this.#format(LogLevel.Info), ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.level <= LogLevel.Warn) {
      console.warn(this.#format(LogLevel.Warn), ...args);
    }
  }

  error(...args: any[]): void {
    if (this.level <= LogLevel.Error) {
      console.error(this.#format(LogLevel.Error), ...args);
    }
  }

  #format(level: LogLevel): string {
    const time = new Date().toISOString().split("T")[1]?.slice(0, 8);
    const prefixStr = this.prefix ? `[${this.prefix}] ` : "";
    
    if (!this.colors) {
      return `[${time}] ${prefixStr}[${LogLevel[level]?.toUpperCase()}]`;
    }

    // Basic ANSI colors
    const colorCode = 
      level === LogLevel.Debug ? "\\x1b[90m" : // Gray
      level === LogLevel.Info ? "\\x1b[36m" : // Cyan
      level === LogLevel.Warn ? "\\x1b[33m" : // Yellow
      level === LogLevel.Error ? "\\x1b[31m" : // Red
      "\\x1b[0m";
    const reset = "\\x1b[0m";

    return `\\x1b[90m[${time}]\\x1b[0m ${prefixStr}${colorCode}[${LogLevel[level]?.toUpperCase()}]${reset}`;
  }
}
