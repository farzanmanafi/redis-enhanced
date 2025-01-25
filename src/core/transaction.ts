import { Client, Schema, Repository, Entity } from "redis-om";
import { createClient } from "redis";

interface EntityData extends Entity {
  [key: string]: any;
  version?: number;
  lastUpdated?: Date;
  entityId?: string;
}

export class TransactionManager<T extends EntityData> {
  private repository: Repository;
  private nativeClient: ReturnType<typeof createClient>;
  private schemaName: string;
  private client: Client;
  private schema: Schema;

  constructor(schema: Schema, client: Client, schemaName: string) {
    this.schema = schema;
    this.client = client;
    this.repository = client.fetchRepository(schema);
    this.schemaName = schemaName;
    this.nativeClient = createClient({
      url: (client as any).url,
    });

    this.initializeClient();
  }

  private async initializeClient() {
    if (!this.nativeClient.isOpen && process.env.NODE_ENV !== "test") {
      await this.nativeClient.connect();
    }
  }

  async save(entity: T): Promise<T> {
    const repository = this.client.fetchRepository(this.schema);
    const savedEntity = {
      ...entity,
      version: (entity.version || 0) + 1,
      lastUpdated: new Date(),
    };

    const result = await repository.save(savedEntity);

    const entityId = Object.getOwnPropertySymbols(result).find(
      (sym) => sym.description === "entityId"
    );

    if (entityId) {
      return {
        ...result,
        entityId: (result as any)[entityId],
      } as T;
    }

    return result as T;
  }

  async fetch(entityId: string): Promise<T | null> {
    try {
      const repository = this.client.fetchRepository(this.schema);
      const entity = await repository.fetch(entityId);

      return entity ? ({ ...entity, entityId } as T) : null;
    } catch (error) {
      console.error("Error fetching entity:", error);
      return null;
    }
  }

  async remove(entityId: string): Promise<void> {
    try {
      await this.repository.remove(entityId);

      const keyPatterns = [
        `${this.schemaName}:${entityId}`,
        `${this.schemaName}:${entityId}:*`,
        `*:${entityId}:*`,
      ];

      for (const pattern of keyPatterns) {
        const keys = await this.nativeClient.keys(pattern);
        if (keys.length > 0) {
          await this.nativeClient.del(keys);
        }
      }

      const remainingKeys = await this.nativeClient.keys(
        `${this.schemaName}:${entityId}*`
      );

      if (remainingKeys.length > 0) {
        await this.nativeClient.del(remainingKeys);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error("Error in remove:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.nativeClient.isOpen) {
      await this.nativeClient.quit();
    }
  }
}
