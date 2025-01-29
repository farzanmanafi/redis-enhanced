import { Client } from "redis-om";
import {
  PersistenceConfig,
  PersistenceType,
} from "../interfaces/persistence.interface";
import { defaultPersistenceConfig } from "../config/persistence.config";
import { ConsoleLogger, LogLevel } from "../logger";
import {
  BaseError,
  ErrorCode,
  ErrorRegistry,
  PersistenceErrorHandler,
} from "../errors";
import { createClient } from "redis";

// Extending the Client type to include Redis commands we need
interface ExtendedRedisClient extends Client {
  info(section: string): Promise<string>;
}

export class PersistenceManager {
  private client: ExtendedRedisClient;
  private config: PersistenceConfig;
  private errorHandler: PersistenceErrorHandler;
  private logger: ConsoleLogger;
  // Initialize with null and use type assertion to handle the definite assignment
  private nativeClient: ReturnType<typeof createClient> = createClient(
    {}
  ) as ReturnType<typeof createClient>;

  constructor(
    client: Client,
    nativeClient?: ReturnType<typeof createClient>,
    config: PersistenceConfig = defaultPersistenceConfig
  ) {
    this.client = client as ExtendedRedisClient;
    this.config = config;
    this.errorHandler = new PersistenceErrorHandler();
    this.logger = new ConsoleLogger(LogLevel.INFO);

    if (nativeClient) {
      this.nativeClient = nativeClient;
    } else {
      this.initializeNativeClient();
    }
  }

  private initializeNativeClient(): void {
    try {
      this.logger.debug(
        "Initializing native Redis client",
        "PersistenceManager"
      );

      this.nativeClient = createClient({
        url: (this.client as any).url,
      });

      // Only auto-connect if not provided externally and not in test environment
      if (process.env.NODE_ENV !== "test") {
        this.nativeClient.connect().catch((err) => {
          this.logger.error(
            "Failed to connect native client",
            "PersistenceManager",
            {
              error: this.formatError(err),
            }
          );
        });
      }
    } catch (err) {
      this.logger.error(
        "Failed to initialize native Redis client",
        "PersistenceManager",
        {
          error: this.formatError(err),
        }
      );
      throw ErrorRegistry.createError(ErrorCode.REDIS_CONNECTION_ERROR, {
        error: this.formatError(err),
      });
    }
  }

  private formatError(error: unknown): Record<string, any> {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }
    return { unknownError: String(error) };
  }

  async setPersistence(config: PersistenceConfig): Promise<void> {
    try {
      this.logger.debug(
        "Setting persistence configuration",
        "PersistenceManager",
        { config }
      );

      // Validate configuration
      this.validatePersistenceConfig(config);

      this.config = config;
      await this.applyPersistenceConfig();

      this.logger.info(
        "Persistence configuration applied successfully",
        "PersistenceManager",
        {
          type: config.type,
        }
      );
    } catch (err: unknown) {
      this.logger.error(
        "Failed to set persistence configuration",
        "PersistenceManager",
        {
          error: this.formatError(err),
          config,
        }
      );

      if (err instanceof BaseError) {
        throw err; // Already a custom error
      }

      throw ErrorRegistry.createError(ErrorCode.PERSISTENCE_CONFIG_ERROR, {
        config,
        error: this.formatError(err),
      });
    }
  }

  private validatePersistenceConfig(config: PersistenceConfig): void {
    if (!Object.values(PersistenceType).includes(config.type)) {
      throw ErrorRegistry.createError(ErrorCode.INVALID_CONFIG, {
        message: "Invalid persistence type",
        type: config.type,
      });
    }

    if (
      config.type === PersistenceType.RDB &&
      !config.rdbOptions?.saveFrequency
    ) {
      throw ErrorRegistry.createError(ErrorCode.INVALID_CONFIG, {
        message: "RDB save frequency is required when using RDB persistence",
        config,
      });
    }

    if (
      config.type === PersistenceType.AOF &&
      !config.aofOptions?.appendfsync
    ) {
      throw ErrorRegistry.createError(ErrorCode.INVALID_CONFIG, {
        message: "AOF sync option is required when using AOF persistence",
        config,
      });
    }
  }

  private async applyPersistenceConfig(): Promise<void> {
    try {
      this.logger.debug(
        "Applying persistence configuration",
        "PersistenceManager"
      );

      if (!this.nativeClient.isOpen) {
        throw new Error("Redis client is not connected");
      }

      // Configure RDB
      if (this.config.type === PersistenceType.RDB) {
        this.logger.debug("Configuring RDB persistence", "PersistenceManager", {
          saveFrequency: this.config.rdbOptions?.saveFrequency,
        });

        await this.nativeClient.configSet(
          "save",
          `${this.config.rdbOptions?.saveFrequency ?? 3600} 1`
        );
      } else {
        this.logger.debug("Disabling RDB persistence", "PersistenceManager");
        await this.nativeClient.configSet("save", "");
      }

      // Configure AOF
      await this.nativeClient.configSet(
        "appendonly",
        this.config.type === PersistenceType.AOF ? "yes" : "no"
      );

      if (this.config.type === PersistenceType.AOF && this.config.aofOptions) {
        this.logger.debug("Configuring AOF persistence", "PersistenceManager", {
          appendfsync: this.config.aofOptions.appendfsync,
        });

        await this.nativeClient.configSet(
          "appendfsync",
          this.config.aofOptions.appendfsync
        );
      }

      this.logger.info(
        "Persistence configuration applied",
        "PersistenceManager",
        {
          type: this.config.type,
        }
      );
    } catch (err: unknown) {
      this.logger.error(
        "Failed to apply persistence configuration",
        "PersistenceManager",
        {
          error: this.formatError(err),
          config: this.config,
        }
      );

      throw ErrorRegistry.createError(ErrorCode.PERSISTENCE_OPERATION_ERROR, {
        operation: "applyConfig",
        error: this.formatError(err),
      });
    }
  }

  async getCurrentConfig(): Promise<PersistenceConfig> {
    try {
      this.logger.debug(
        "Fetching current persistence configuration",
        "PersistenceManager"
      );

      if (!this.nativeClient.isOpen) {
        throw new Error("Redis client is not connected");
      }

      const [save, appendonly, appendfsync] = await Promise.all([
        this.nativeClient.configGet("save"),
        this.nativeClient.configGet("appendonly"),
        this.nativeClient.configGet("appendfsync"),
      ]);

      const config: PersistenceConfig = {
        type: PersistenceType.NONE,
      };

      if (save.save && save.save !== "") {
        config.type = PersistenceType.RDB;
        config.rdbOptions = {
          saveFrequency: parseInt(save.save.split(" ")[0]),
        };
      } else if (appendonly.appendonly === "yes") {
        config.type = PersistenceType.AOF;
        config.aofOptions = {
          appendfsync: appendfsync.appendfsync as any,
        };
      }

      this.logger.info(
        "Current persistence configuration retrieved",
        "PersistenceManager",
        {
          config,
        }
      );

      return config;
    } catch (err: unknown) {
      this.logger.error(
        "Failed to get current persistence configuration",
        "PersistenceManager",
        {
          error: this.formatError(err),
        }
      );

      throw ErrorRegistry.createError(ErrorCode.PERSISTENCE_OPERATION_ERROR, {
        operation: "getCurrentConfig",
        error: this.formatError(err),
      });
    }
  }

  async checkPersistenceStatus(): Promise<{
    rdbSaveInProgress: boolean;
    aofRewriteInProgress: boolean;
    lastRdbSaveTime: number;
    lastAofRewriteTime: number;
  }> {
    try {
      this.logger.debug("Checking persistence status", "PersistenceManager");

      if (!this.nativeClient.isOpen) {
        throw new Error("Redis client is not connected");
      }

      const info = await this.nativeClient.info("persistence");
      const status = {
        rdbSaveInProgress: false,
        aofRewriteInProgress: false,
        lastRdbSaveTime: 0,
        lastAofRewriteTime: 0,
      };

      const lines = info.split("\n");
      for (const line of lines) {
        const [key, value] = line.split(":");
        switch (key) {
          case "rdb_bgsave_in_progress":
            status.rdbSaveInProgress = value === "1";
            break;
          case "aof_rewrite_in_progress":
            status.aofRewriteInProgress = value === "1";
            break;
          case "rdb_last_save_time":
            status.lastRdbSaveTime = parseInt(value);
            break;
          case "aof_last_rewrite_time":
            status.lastAofRewriteTime = parseInt(value);
            break;
        }
      }

      this.logger.info(
        "Persistence status retrieved",
        "PersistenceManager",
        status
      );
      return status;
    } catch (err: unknown) {
      this.logger.error(
        "Failed to check persistence status",
        "PersistenceManager",
        {
          error: this.formatError(err),
        }
      );

      throw ErrorRegistry.createError(ErrorCode.PERSISTENCE_OPERATION_ERROR, {
        operation: "checkStatus",
        error: this.formatError(err),
      });
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.logger.debug(
        "Disconnecting native Redis client",
        "PersistenceManager"
      );

      if (this.nativeClient?.isOpen) {
        await this.nativeClient.quit();
        this.logger.info(
          "Native Redis client disconnected successfully",
          "PersistenceManager"
        );
      }
    } catch (err: unknown) {
      this.logger.error("Failed to disconnect", "PersistenceManager", {
        error: this.formatError(err),
      });
      throw ErrorRegistry.createError(ErrorCode.REDIS_CONNECTION_ERROR, {
        operation: "disconnect",
        error: this.formatError(err),
      });
    }
  }

  isConnected(): boolean {
    return this.nativeClient?.isOpen ?? false;
  }
}
