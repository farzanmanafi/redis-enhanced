// import { Client, Schema } from "redis-om";
// import { RedisConfig, defaultRedisConfig } from "../config/redis.config";
// import { PersistenceManager } from "./persistence";
// import { TransactionManager } from "./transaction";
// import { EntityData } from "../interfaces/entity.interface";

// export class EnhancedRedisClient {
//   private client: InstanceType<typeof Client>;
//   private persistence: PersistenceManager;
//   private transactionManager: TransactionManager<EntityData> | null = null;
//   private schema: InstanceType<typeof Schema>;
//   private config: RedisConfig;

//   constructor(config: RedisConfig = defaultRedisConfig) {
//     if (!config.url) {
//       throw new Error("Redis URL is required");
//     }

//     this.config = config;
//     this.client = new Client();

//     this.schema = new Schema("base", {
//       version: { type: "number" },
//       lastUpdated: { type: "date" },
//     });

//     this.persistence = new PersistenceManager(this.client);
//   }

//   async connect(): Promise<void> {
//     const { url, password, username, db } = this.config;

//     let connectionUrl = url.startsWith("redis://") ? url : `redis://${url}`;

//     if (password) {
//       const userInfo = username ? `${username}:${password}` : password;
//       connectionUrl = connectionUrl.replace("redis://", `redis://${userInfo}@`);
//     }

//     if (db !== undefined) {
//       connectionUrl = `${connectionUrl}/${db}`;
//     }

//     try {
//       await this.client.open(connectionUrl);

//       // Create transaction manager after connection
//       this.transactionManager = new TransactionManager<EntityData>(
//         this.schema,
//         this.client,
//         "base"
//       );
//     } catch (err) {
//       throw err;
//     }
//   }

//   getRedisClient(): Client {
//     return this.client;
//   }

//   async disconnect(): Promise<void> {
//     await this.client.close();
//   }

//   getPersistenceManager(): PersistenceManager {
//     return this.persistence;
//   }

//   getTransactionManager(): TransactionManager<EntityData> {
//     if (!this.transactionManager) {
//       throw new Error("Client not connected. Call connect() first.");
//     }
//     return this.transactionManager;
//   }
// }

import { Client, Schema } from "redis-om";
import { createClient } from "redis";
import { RedisConfig, defaultRedisConfig } from "../config/redis.config";
import { TransactionManager } from "./transaction";
import { EntityData } from "../interfaces/entity.interface";
import { ConsoleLogger, LogLevel } from "../logger";
import { ErrorRegistry, ErrorCode } from "../errors";
import { PersistenceManager } from "./persistence";

// Type for native Redis client with required methods
type ExtendedRedisClient = ReturnType<typeof createClient>;

export class EnhancedRedisClient {
  private client: Client;
  private nativeClient!: ExtendedRedisClient;
  private persistence: PersistenceManager;
  private transactionManager: TransactionManager<EntityData> | null = null;
  private schema: Schema;
  private config: RedisConfig;
  private logger: ConsoleLogger;
  private isConnected: boolean = false;

  constructor(config: RedisConfig = defaultRedisConfig) {
    this.validateConfig(config);

    this.config = config;
    this.client = new Client();
    this.logger = new ConsoleLogger(LogLevel.INFO);

    this.schema = new Schema("base", {
      version: { type: "number" },
      lastUpdated: { type: "date" },
    });

    this.persistence = new PersistenceManager(this.client);
    this.initializeNativeClient();
  }

  private initializeNativeClient(): void {
    this.nativeClient = createClient({
      url: this.config.url,
      username: this.config.username,
      password: this.config.password,
      database: this.config.db,
    });
  }

  private validateConfig(config: RedisConfig): void {
    if (!config.url) {
      throw ErrorRegistry.createError(ErrorCode.INVALID_CONFIG, {
        message: "Redis URL is required",
      });
    }

    try {
      new URL(config.url);
    } catch (err) {
      throw ErrorRegistry.createError(ErrorCode.INVALID_CONFIG, {
        message: "Invalid Redis URL format",
        url: config.url,
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

  async connect(): Promise<void> {
    try {
      this.logger.debug("Connecting to Redis", "EnhancedRedisClient", {
        url: this.config.url,
      });

      const { url, password, username, db } = this.config;
      let connectionUrl = url.startsWith("redis://") ? url : `redis://${url}`;

      if (password) {
        const userInfo = username ? `${username}:${password}` : password;
        connectionUrl = connectionUrl.replace(
          "redis://",
          `redis://${userInfo}@`
        );
      }

      if (db !== undefined) {
        connectionUrl = `${connectionUrl}/${db}`;
      }

      // Connect both clients
      await Promise.all([
        this.client.open(connectionUrl),
        this.nativeClient.connect(),
      ]);

      this.isConnected = true;

      // Create transaction manager after connection
      this.transactionManager = new TransactionManager<EntityData>(
        this.schema,
        this.client,
        "base"
      );

      this.logger.info(
        "Successfully connected to Redis",
        "EnhancedRedisClient"
      );
    } catch (err: unknown) {
      this.logger.error("Failed to connect to Redis", "EnhancedRedisClient", {
        error: this.formatError(err),
        config: { ...this.config, password: "***" },
      });

      throw ErrorRegistry.createError(ErrorCode.REDIS_CONNECTION_ERROR, {
        error: this.formatError(err),
      });
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.logger.debug("Disconnecting from Redis", "EnhancedRedisClient");

      // Disconnect persistence manager
      await this.persistence.disconnect();

      // Disconnect transaction manager if exists
      if (this.transactionManager) {
        await this.transactionManager.disconnect();
      }

      // Close both client connections
      await Promise.all([this.client.close(), this.nativeClient.quit()]);

      this.isConnected = false;

      this.logger.info(
        "Successfully disconnected from Redis",
        "EnhancedRedisClient"
      );
    } catch (err: unknown) {
      this.logger.error(
        "Failed to disconnect from Redis",
        "EnhancedRedisClient",
        {
          error: this.formatError(err),
        }
      );

      throw ErrorRegistry.createError(ErrorCode.REDIS_CONNECTION_ERROR, {
        operation: "disconnect",
        error: this.formatError(err),
      });
    }
  }

  getRedisClient(): Client {
    if (!this.isConnected) {
      throw ErrorRegistry.createError(ErrorCode.REDIS_CONNECTION_ERROR, {
        message: "Client not connected. Call connect() first.",
      });
    }
    return this.client;
  }

  getPersistenceManager(): PersistenceManager {
    if (!this.isConnected) {
      throw ErrorRegistry.createError(ErrorCode.REDIS_CONNECTION_ERROR, {
        message: "Client not connected. Call connect() first.",
      });
    }
    return this.persistence;
  }

  getTransactionManager(): TransactionManager<EntityData> {
    if (!this.isConnected || !this.transactionManager) {
      throw ErrorRegistry.createError(ErrorCode.REDIS_CONNECTION_ERROR, {
        message: "Client not connected. Call connect() first.",
      });
    }
    return this.transactionManager;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const response = await this.nativeClient.ping();
      return response === "PONG";
    } catch (err: unknown) {
      this.logger.error("Failed to ping Redis", "EnhancedRedisClient", {
        error: this.formatError(err),
      });
      return false;
    }
  }

  async getServerInfo(): Promise<Record<string, any>> {
    try {
      if (!this.isConnected) {
        throw ErrorRegistry.createError(ErrorCode.REDIS_CONNECTION_ERROR, {
          message: "Client not connected. Call connect() first.",
        });
      }

      const info = await this.nativeClient.info();
      const sections: Record<string, any> = {};

      let currentSection = "";
      info.split("\n").forEach((line: string) => {
        if (line.startsWith("#")) {
          currentSection = line.substring(2).toLowerCase();
          sections[currentSection] = {};
        } else if (line.includes(":")) {
          const [key, value] = line.split(":");
          if (currentSection && key) {
            sections[currentSection][key.trim()] = value.trim();
          }
        }
      });

      return sections;
    } catch (err: unknown) {
      this.logger.error("Failed to get server info", "EnhancedRedisClient", {
        error: this.formatError(err),
      });

      throw ErrorRegistry.createError(ErrorCode.REDIS_OPERATION_ERROR, {
        operation: "getServerInfo",
        error: this.formatError(err),
      });
    }
  }

  async flushDb(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw ErrorRegistry.createError(ErrorCode.REDIS_CONNECTION_ERROR, {
          message: "Client not connected. Call connect() first.",
        });
      }

      await this.nativeClient.flushDb();
      this.logger.info("Successfully flushed database", "EnhancedRedisClient");
    } catch (err: unknown) {
      this.logger.error("Failed to flush database", "EnhancedRedisClient", {
        error: this.formatError(err),
      });

      throw ErrorRegistry.createError(ErrorCode.REDIS_OPERATION_ERROR, {
        operation: "flushDb",
        error: this.formatError(err),
      });
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
