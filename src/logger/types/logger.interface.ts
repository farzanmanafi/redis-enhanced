export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

export interface LogMetadata {
  timestamp: string;
  level: LogLevel;
  context?: string;
  [key: string]: any;
}

export interface LogEntry {
  message: string;
  metadata: LogMetadata;
}

export interface Logger {
  error(
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void;
  warn(message: string, context?: string, metadata?: Record<string, any>): void;
  info(message: string, context?: string, metadata?: Record<string, any>): void;
  debug(
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void;
}
