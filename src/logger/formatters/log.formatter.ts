import { LogEntry, LogLevel, LogMetadata } from "../types/logger.interface";

export class LogFormatter {
  static format(
    message: string,
    level: LogLevel,
    context?: string,
    metadata?: Record<string, any>
  ): LogEntry {
    const timestamp = new Date().toISOString();

    const logMetadata: LogMetadata = {
      timestamp,
      level,
      context,
      ...metadata,
    };

    return {
      message,
      metadata: logMetadata,
    };
  }

  static formatConsole(logEntry: LogEntry): string {
    const { message, metadata } = logEntry;
    const { timestamp, level, context, ...rest } = metadata;

    let formattedMessage = `[${timestamp}] ${level.toUpperCase()}`;
    if (context) {
      formattedMessage += ` [${context}]`;
    }
    formattedMessage += `: ${message}`;

    if (Object.keys(rest).length > 0) {
      formattedMessage += `\n${JSON.stringify(rest, null, 2)}`;
    }

    return formattedMessage;
  }
}
