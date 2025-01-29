import { Client, Schema, Repository } from "redis-om";
import { createClient } from "redis";
import { ConsoleLogger, LogLevel } from "../logger";
import { EntityData } from "../interfaces/entity.interface";
import { BaseError } from "../errors/types/base.error";
import { ErrorCode, ErrorRegistry, TransactionErrorHandler } from "../errors";

// Extend the Redis client type to include transaction methods
type ExtendedRedisClient = ReturnType<typeof createClient> & {
  multi: () => ExtendedRedisClient;
  exec: () => Promise<any[]>;
  discard: () => Promise<void>;
  keys: (pattern: string) => Promise<string[]>;
  del: (keys: string[]) => Promise<number>;
};

export class TransactionManager<T extends EntityData> {
  // Private properties
  private repository: Repository;
  private nativeClient!: ExtendedRedisClient;
  private schemaName: string;
  private client: Client;
  private schema: Schema;
  private errorHandler: TransactionErrorHandler;
  private logger: ConsoleLogger;
  private isTransactionActive: boolean = false;

  /**
   * Constructor for TransactionManager
   * @param schema - The Redis-OM schema for entities
   * @param client - The Redis-OM client
   * @param schemaName - Name of the schema/collection
   * @param nativeClient - Optional native Redis client
   */
  constructor(
    schema: Schema,
    client: Client,
    schemaName: string,
    nativeClient?: ReturnType<typeof createClient>
  ) {
    this.schema = schema;
    this.client = client;
    this.repository = client.fetchRepository(schema);
    this.schemaName = schemaName;
    this.errorHandler = new TransactionErrorHandler();
    this.logger = new ConsoleLogger(LogLevel.INFO);

    // Use provided native client or create a new one
    this.nativeClient = (nativeClient ||
      createClient({
        url: (this.client as any).url,
      })) as ExtendedRedisClient;
  }

  /**
   * Format error object for logging and error handling
   * @param error - The error to format
   * @returns A formatted error object
   */
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

  /**
   * Save an entity to the repository
   * @param entity - The entity to save
   * @returns The saved entity
   */
  async save(entity: T): Promise<T> {
    try {
      // Ensure client is connected
      await this.ensureConnected();

      this.logger.debug("Saving entity", "TransactionManager", { entity });

      // Prepare entity with version and timestamp
      const savedEntity = {
        ...entity,
        version: (entity.version || 0) + 1,
        lastUpdated: new Date(),
      };

      // Save entity using repository
      const result = await this.repository.save(savedEntity);

      // Extract entityId
      const entityId = Object.getOwnPropertySymbols(result).find(
        (sym) => sym.description === "entityId"
      );

      if (entityId) {
        const finalEntity = {
          ...result,
          entityId: (result as any)[entityId],
        } as T;

        this.logger.info("Entity saved successfully", "TransactionManager", {
          entityId: finalEntity.entityId,
        });

        return finalEntity;
      }

      this.logger.warn(
        "Entity saved but no entityId found",
        "TransactionManager",
        { result }
      );

      return result as T;
    } catch (err: unknown) {
      this.logger.error("Failed to save entity", "TransactionManager", {
        error: this.formatError(err),
        entity,
      });

      throw ErrorRegistry.createError(ErrorCode.TRANSACTION_ERROR, {
        operation: "save",
        error: this.formatError(err),
        entity,
      });
    }
  }

  /**
   * Fetch an entity by its ID
   * @param entityId - The ID of the entity to fetch
   * @returns The fetched entity or null
   */
  async fetch(entityId: string): Promise<T | null> {
    try {
      // Ensure client is connected
      await this.ensureConnected();

      this.logger.debug("Fetching entity", "TransactionManager", { entityId });

      // First, check if keys exist using native client
      const keyPattern = `${this.schemaName}:${entityId}*`;
      const keys = await this.nativeClient.keys(keyPattern);

      // If no keys exist, throw not found error
      if (keys.length === 0) {
        this.logger.warn("No keys found for entity", "TransactionManager", {
          entityId,
        });

        throw ErrorRegistry.createError(ErrorCode.ENTITY_NOT_FOUND, {
          entityId,
        });
      }

      // Fetch entity using repository
      const entity = await this.repository.fetch(entityId);

      if (!entity) {
        this.logger.warn("Entity not found", "TransactionManager", {
          entityId,
        });

        throw ErrorRegistry.createError(ErrorCode.ENTITY_NOT_FOUND, {
          entityId,
        });
      }

      this.logger.info("Entity fetched successfully", "TransactionManager", {
        entityId,
      });

      return { ...entity, entityId } as T;
    } catch (err: unknown) {
      this.logger.error("Failed to fetch entity", "TransactionManager", {
        error: this.formatError(err),
        entityId,
      });

      if (err instanceof BaseError && err.code === ErrorCode.ENTITY_NOT_FOUND) {
        throw err;
      }

      throw ErrorRegistry.createError(ErrorCode.TRANSACTION_ERROR, {
        operation: "fetch",
        error: this.formatError(err),
        entityId,
      });
    }
  }

  /**
   * Remove an entity by its ID
   * @param entityId - The ID of the entity to remove
   */
  async remove(entityId: string): Promise<void> {
    try {
      // Ensure client is connected
      await this.ensureConnected();

      this.logger.debug("Removing entity", "TransactionManager", { entityId });

      // Verify entity exists before removing
      await this.fetch(entityId);

      // Remove entity using native client methods
      const keyPattern = `${this.schemaName}:${entityId}*`;

      // Find and delete all keys matching the entity
      const keys = await this.nativeClient.keys(keyPattern);

      if (keys.length > 0) {
        await this.nativeClient.del(keys);
      }

      // Additional removal using repository (best effort)
      try {
        await this.repository.remove(entityId);
      } catch (repoRemoveErr) {
        this.logger.warn("Repository removal failed", "TransactionManager", {
          entityId,
          error: this.formatError(repoRemoveErr),
        });
      }

      // Verify removal by checking keys
      const remainingKeys = await this.nativeClient.keys(keyPattern);
      if (remainingKeys.length > 0) {
        throw ErrorRegistry.createError(ErrorCode.TRANSACTION_ERROR, {
          entityId,
          message: "Failed to completely remove entity keys",
        });
      }

      this.logger.info("Entity removed successfully", "TransactionManager", {
        entityId,
      });
    } catch (err: unknown) {
      this.logger.error("Failed to remove entity", "TransactionManager", {
        error: this.formatError(err),
        entityId,
      });

      throw ErrorRegistry.createError(ErrorCode.TRANSACTION_ERROR, {
        operation: "remove",
        error: this.formatError(err),
        entityId,
      });
    }
  }
  /**
   * Begin a new transaction
   */
  async beginTransaction(): Promise<void> {
    try {
      // Ensure client is connected
      await this.ensureConnected();

      // Check if a transaction is already in progress
      if (this.isTransactionActive) {
        throw new Error("A transaction is already in progress");
      }

      this.logger.debug("Beginning transaction", "TransactionManager");

      // Start a multi transaction
      this.nativeClient.multi();
      this.isTransactionActive = true;

      this.logger.info("Transaction started", "TransactionManager");
    } catch (err: unknown) {
      this.logger.error("Failed to begin transaction", "TransactionManager", {
        error: this.formatError(err),
      });

      throw ErrorRegistry.createError(ErrorCode.TRANSACTION_ERROR, {
        operation: "begin",
        error: this.formatError(err),
      });
    }
  }

  /**
   * Commit the current transaction
   */
  async commitTransaction(): Promise<void> {
    try {
      // Ensure a transaction is active
      this.validateActiveTransaction();

      this.logger.debug("Committing transaction", "TransactionManager");

      await this.nativeClient.exec();
      this.isTransactionActive = false;

      this.logger.info("Transaction committed", "TransactionManager");
    } catch (err: unknown) {
      this.logger.error("Failed to commit transaction", "TransactionManager", {
        error: this.formatError(err),
      });

      throw ErrorRegistry.createError(ErrorCode.TRANSACTION_COMMIT_ERROR, {
        error: this.formatError(err),
      });
    }
  }

  /**
   * Rollback the current transaction
   */
  async rollbackTransaction(): Promise<void> {
    try {
      // Ensure a transaction is active
      this.validateActiveTransaction();

      this.logger.debug("Rolling back transaction", "TransactionManager");

      await this.nativeClient.discard();
      this.isTransactionActive = false;

      this.logger.info("Transaction rolled back", "TransactionManager");
    } catch (err: unknown) {
      this.logger.error(
        "Failed to rollback transaction",
        "TransactionManager",
        {
          error: this.formatError(err),
        }
      );

      throw ErrorRegistry.createError(ErrorCode.TRANSACTION_ROLLBACK_ERROR, {
        error: this.formatError(err),
      });
    }
  }

  /**
   * Disconnect the transaction manager
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.debug(
        "Disconnecting transaction manager",
        "TransactionManager"
      );

      // Rollback any active transaction
      if (this.isTransactionActive) {
        await this.rollbackTransaction();
      }

      // Quit the native client
      if (this.nativeClient?.isOpen) {
        await this.nativeClient.quit();
        this.logger.info(
          "Transaction manager disconnected",
          "TransactionManager"
        );
      }
    } catch (err: unknown) {
      this.logger.error(
        "Failed to disconnect transaction manager",
        "TransactionManager",
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

  /**
   * Check if the client is connected
   * @returns Boolean indicating connection status
   */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.nativeClient?.isOpen) {
        return false;
      }

      await this.nativeClient.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the client is connected
   * @throws Error if client is not connected
   */
  private async ensureConnected(): Promise<void> {
    const isConnected = await this.isConnected();
    if (!isConnected) {
      throw new Error("Client is not connected");
    }
  }

  /**
   * Validate that a transaction is currently active
   * @throws Error if no active transaction
   */
  private validateActiveTransaction(): void {
    if (!this.isTransactionActive) {
      throw new Error("No active transaction to process");
    }
  }
}
