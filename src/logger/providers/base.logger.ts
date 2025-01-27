import { Logger, LogLevel, LogEntry } from "../types/logger.interface";
import { LogFormatter } from "../formatters/log.formatter";

export abstract class BaseLogger implements Logger {
  protected minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  abstract log(logEntry: LogEntry): void;

  error(
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.logWithLevel(LogLevel.ERROR, message, context, metadata);
  }

  warn(
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.logWithLevel(LogLevel.WARN, message, context, metadata);
  }

  info(
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.logWithLevel(LogLevel.INFO, message, context, metadata);
  }

  debug(
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.logWithLevel(LogLevel.DEBUG, message, context, metadata);
  }

  private logWithLevel(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    if (this.shouldLog(level)) {
      const logEntry = LogFormatter.format(message, level, context, metadata);
      this.log(logEntry);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) <= levels.indexOf(this.minLevel);
  }
}
