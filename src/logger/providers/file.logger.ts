import * as fs from "fs";
import * as path from "path";
import { BaseLogger } from "./base.logger";
import { LogEntry, LogLevel } from "../types/logger.interface";

export class FileLogger extends BaseLogger {
  private logDir: string;
  private logFile: string;

  constructor(
    logDir: string = "logs",
    logFile: string = "redis-enhanced.log",
    minLevel: LogLevel = LogLevel.INFO
  ) {
    super(minLevel);
    this.logDir = logDir;
    this.logFile = logFile;
    this.initializeLogDir();
  }

  private initializeLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(logEntry: LogEntry): void {
    const logPath = path.join(this.logDir, this.logFile);
    const logLine = JSON.stringify(logEntry) + "\n";

    fs.appendFileSync(logPath, logLine);
  }
}
