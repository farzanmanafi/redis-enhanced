import * as dotenv from "dotenv";
dotenv.config();

import { EnhancedRedisClient } from "../src";
import { createClient } from "redis";
import {
  PersistenceType,
  AOFSyncOption,
} from "../src/interfaces/persistence.interface";
import { ENV } from "../src/config/env.config";
import { validateEnv } from "../src/utils/env.validator";

async function persistenceExample() {
  // When connecting to Redis with authentication, we need to properly format the URL
  // The format should be: redis://default:password@hostname:port
  // 'default' is the default username when none is specified
  validateEnv();

  const REDIS_URL = `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  // Create both clients with proper authentication
  const enhancedClient = new EnhancedRedisClient({
    url: REDIS_URL,
  });

  const nativeRedisClient = createClient({
    url: REDIS_URL,
  });

  try {
    // Connect both clients
    console.log("Connecting to Redis...");
    await Promise.all([enhancedClient.connect(), nativeRedisClient.connect()]);
    console.log("Connected to Redis successfully");

    const persistenceManager = enhancedClient.getPersistenceManager();

    // Configure persistence
    console.log("Configuring AOF persistence...");
    await persistenceManager.setPersistence({
      type: PersistenceType.AOF,
      aofOptions: {
        appendfsync: AOFSyncOption.EVERYSEC,
      },
    });

    // Verify configuration using native Redis client
    const info = await nativeRedisClient.info("persistence");
    console.log("\nRedis Persistence Configuration:");
    console.log(info);

    // Test persistence by saving and retrieving data
    const transactionManager = enhancedClient.getTransactionManager();

    // Save test data
    const testEntity = await transactionManager.save({
      name: "test",
      value: "persistence test",
      timestamp: new Date().toISOString(),
    });

    console.log("\nSaved test entity:", testEntity);

    // Retrieve the saved data
    const retrieved = await transactionManager.fetch(testEntity.entityId!);
    console.log("Retrieved test entity:", retrieved);
  } catch (error) {
    console.error("Error in persistence example:", error);
    // Provide more detailed error information for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
  } finally {
    // Clean up connections
    console.log("\nCleaning up connections...");
    try {
      await enhancedClient.disconnect();
      await nativeRedisClient.quit();
      console.log("Disconnected from Redis");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}

// Run the example
persistenceExample().catch((error) => {
  console.error("Fatal error in persistence example:", error);
  process.exit(1);
});
