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
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const prefixStr = this.prefix ? `\x1b[90m[\x1b[37m${this.prefix}\x1b[90m]\x1b[0m ` : "";
    
    if (!this.colors) {
      return `[${time}] ${this.prefix ? `[${this.prefix}] ` : ""}[${LogLevel[level]?.toUpperCase()}]`;
    }

    const levelColors = {
      [LogLevel.Debug]: "\x1b[90m", // Gray
      [LogLevel.Info]: "\x1b[36m",  // Cyan
      [LogLevel.Warn]: "\x1b[33m",  // Yellow
      [LogLevel.Error]: "\x1b[31m", // Red
      [LogLevel.None]: "\x1b[0m"
    };

    const levelStr = LogLevel[level]?.toUpperCase().padEnd(5);
    const color = levelColors[level] ?? "\x1b[0m";
    const reset = "\x1b[0m";

    return `\x1b[90m${time}\x1b[0m ${color}${levelStr}${reset} ${prefixStr}`;
  }
}
