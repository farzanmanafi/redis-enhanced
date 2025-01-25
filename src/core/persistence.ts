import { Client } from "redis-om";
import {
  PersistenceConfig,
  PersistenceType,
} from "../interfaces/persistence.interface";
import { defaultPersistenceConfig } from "../config/persistence.config";

export class PersistenceManager {
  private client: Client;
  private config: PersistenceConfig;

  constructor(
    client: Client,
    config: PersistenceConfig = defaultPersistenceConfig
  ) {
    this.client = client;
    this.config = config;
  }

  async setPersistence(config: PersistenceConfig): Promise<void> {
    this.config = config;
    await this.applyPersistenceConfig();
  }

  private async applyPersistenceConfig(): Promise<void> {
    if (this.config.type === PersistenceType.RDB) {
      await this.client.set(
        "save",
        `${this.config.rdbOptions?.saveFrequency ?? 3600} 1`
      );
    } else {
      //"Disabling RDB"
      await this.client.set("save", "");
    }

    // "Setting AOF configuration"
    await this.client.set(
      "appendonly",
      this.config.type === PersistenceType.AOF ? "yes" : "no"
    );

    if (this.config.type === PersistenceType.AOF && this.config.aofOptions) {
      // "Setting AOF sync option"
      await this.client.set("appendfsync", this.config.aofOptions.appendfsync);
    }
    // "Persistence configuration applied"
  }
}
