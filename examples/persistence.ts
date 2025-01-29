import "dotenv/config";
import { Client, Schema } from "redis-om";
import { createClient, RedisClientType } from "redis";
import { EnhancedRedisClient } from "../src/core/client";
import { PersistenceManager } from "../src/core/persistence";
import { TransactionManager } from "../src/core/transaction";
import { validateEnv } from "../src/utils/env.validator";
import { EntityData } from "../src/interfaces/entity.interface";
import {
  PersistenceType,
  AOFSyncOption,
  PersistenceConfig,
} from "../src/interfaces/persistence.interface";

// Define an interface for our entity
interface TransactionEntity extends EntityData {
  amount: number;
  description: string;
  timestamp: Date;
}

async function persistenceExample() {
  // Validate environment variables
  validateEnv();

  // Create Redis connection URL
  const redisUrl = `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  // Create native Redis clients
  const nativePersistenceClient = createClient({
    url: redisUrl,
  }) as RedisClientType;

  // Create Enhanced Redis Client
  const enhancedClient = new EnhancedRedisClient({
    url: redisUrl,
  });

  // Create Redis-OM client
  const redisOmClient = new Client();

  try {
    // Connect all clients with explicit connection
    await nativePersistenceClient.connect();
    await enhancedClient.connect();
    await redisOmClient.open(redisUrl);

    // Manually create PersistenceManager with the connected native client
    const persistenceManager = new PersistenceManager(
      redisOmClient,
      nativePersistenceClient
    );

    // Create a schema for the transaction entity
    const transactionSchema = new Schema<TransactionEntity>("transaction", {
      amount: { type: "number" },
      description: { type: "string" },
      timestamp: { type: "date" },
    });

    // Create transaction manager with a new client
    const transactionManager = new TransactionManager<TransactionEntity>(
      transactionSchema,
      redisOmClient,
      "transaction",
      nativePersistenceClient
    );

    // Debug: Check if native client is connected
    console.log("Is Native Client Connected:", nativePersistenceClient.isOpen);
    console.log(
      "Native Client Connection Status:",
      await nativePersistenceClient.ping()
    );

    // Demonstrate different persistence configurations
    console.log("\n--- Persistence Configuration Demonstration ---");

    // 1. Configure RDB (Redis Database) Persistence
    console.log("\n1. Configuring RDB Persistence:");
    const rdbConfig: PersistenceConfig = {
      type: PersistenceType.RDB,
      rdbOptions: {
        saveFrequency: 60, // Save every 60 seconds
      },
    };

    // Log additional debug info
    console.log(
      "Attempting to set persistence config:",
      JSON.stringify(rdbConfig)
    );

    try {
      await persistenceManager.setPersistence(rdbConfig);
      console.log("RDB Persistence configured with 60-second save frequency");
    } catch (configError) {
      console.error("Failed to set persistence config:", configError);
      throw configError;
    }

    // Create and save some transactions
    const transactions: TransactionEntity[] = [
      {
        amount: 100.5,
        description: "Initial deposit",
        timestamp: new Date(),
      },
      {
        amount: -50.25,
        description: "Grocery shopping",
        timestamp: new Date(),
      },
    ];

    const savedTransactions = await Promise.all(
      transactions.map((tx) => transactionManager.save(tx))
    );
    console.log("\nSaved Transactions:", savedTransactions);

    // 2. Check current persistence configuration
    console.log("\n2. Retrieving Current Persistence Configuration:");
    const currentConfig = await persistenceManager.getCurrentConfig();
    console.log(
      "Current Persistence Config:",
      JSON.stringify(currentConfig, null, 2)
    );

    // 3. Check persistence status
    console.log("\n3. Checking Persistence Status:");
    const persistenceStatus = await persistenceManager.checkPersistenceStatus();
    console.log(
      "Persistence Status:",
      JSON.stringify(persistenceStatus, null, 2)
    );

    // 4. Switch to AOF Persistence
    console.log("\n4. Switching to AOF Persistence:");
    const aofConfig: PersistenceConfig = {
      type: PersistenceType.AOF,
      aofOptions: {
        appendfsync: AOFSyncOption.EVERYSEC,
      },
    };
    await persistenceManager.setPersistence(aofConfig);
    console.log(
      "Switched to AOF Persistence with every second synchronization"
    );

    // Fetch and display saved transactions
    console.log("\n5. Fetching Saved Transactions:");
    const fetchedTransactions = await Promise.all(
      savedTransactions.map((tx) => transactionManager.fetch(tx.entityId!))
    );
    console.log("Fetched Transactions:", fetchedTransactions);
  } catch (error) {
    console.error("Error in persistence example:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
  } finally {
    try {
      // Disconnect clients
      await enhancedClient.disconnect();
      await redisOmClient.close();
      await nativePersistenceClient.quit();
      console.log("\nDisconnected from Redis");
    } catch (disconnectError) {
      console.error("Error during disconnection:", disconnectError);
    }
  }
}

// Run the example
persistenceExample().catch(console.error);
