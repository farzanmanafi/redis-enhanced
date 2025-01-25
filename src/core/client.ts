import { Client, Schema } from "redis-om";
import { RedisConfig, defaultRedisConfig } from "../config/redis.config";
import { PersistenceManager } from "./persistence";
import { TransactionManager } from "./transaction";
import { EntityData } from "../interfaces/entity.interface";

export class EnhancedRedisClient {
  private client: InstanceType<typeof Client>;
  private persistence: PersistenceManager;
  private transactionManager: TransactionManager<EntityData> | null = null;
  private schema: InstanceType<typeof Schema>;
  private config: RedisConfig;

  constructor(config: RedisConfig = defaultRedisConfig) {
    if (!config.url) {
      throw new Error("Redis URL is required");
    }

    this.config = config;
    this.client = new Client();

    this.schema = new Schema("base", {
      version: { type: "number" },
      lastUpdated: { type: "date" },
    });

    this.persistence = new PersistenceManager(this.client);
  }

  async connect(): Promise<void> {
    const { url, password, username, db } = this.config;

    let connectionUrl = url.startsWith("redis://") ? url : `redis://${url}`;

    if (password) {
      const userInfo = username ? `${username}:${password}` : password;
      connectionUrl = connectionUrl.replace("redis://", `redis://${userInfo}@`);
    }

    if (db !== undefined) {
      connectionUrl = `${connectionUrl}/${db}`;
    }

    try {
      await this.client.open(connectionUrl);

      // Create transaction manager after connection
      this.transactionManager = new TransactionManager<EntityData>(
        this.schema,
        this.client,
        "base"
      );
    } catch (err) {
      throw err;
    }
  }

  getRedisClient(): Client {
    return this.client;
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  getPersistenceManager(): PersistenceManager {
    return this.persistence;
  }

  getTransactionManager(): TransactionManager<EntityData> {
    if (!this.transactionManager) {
      throw new Error("Client not connected. Call connect() first.");
    }
    return this.transactionManager;
  }
}
