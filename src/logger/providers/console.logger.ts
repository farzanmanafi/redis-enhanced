import { BaseLogger } from "./base.logger";
import { LogEntry, LogLevel } from "../types/logger.interface";
import { LogFormatter } from "../formatters/log.formatter";

export class ConsoleLogger extends BaseLogger {
  log(logEntry: LogEntry): void {
    const formattedMessage = LogFormatter.formatConsole(logEntry);
    const consoleMethod = this.getConsoleMethod(logEntry.metadata.level);
    consoleMethod(formattedMessage);
  }

  private getConsoleMethod(level: LogLevel): (message: string) => void {
    switch (level) {
      case LogLevel.ERROR:
        return console.error;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.DEBUG:
        return console.debug;
      default:
        return console.log;
    }
  }
}
