import "dotenv/config";
import { Client, Schema, Entity } from "redis-om";
import { createClient } from "redis";
import { TransactionManager } from "../src/core/transaction";
import { validateEnv } from "../src/utils/env.validator";
import { EntityData } from "../src/interfaces/entity.interface";

// Define an interface for our entity that extends EntityData
interface UserEntity extends EntityData {
  name: string;
  email: string;
  age?: number;
}

async function basicExample() {
  // Validate environment variables
  validateEnv();

  // Create Redis connection URL
  const redisUrl = `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  // Create native Redis client
  const nativeRedisClient = createClient({
    url: redisUrl,
  });

  // Create Redis-OM client
  const redisOmClient = new Client();

  try {
    // Connect both clients
    await Promise.all([
      nativeRedisClient.connect(),
      redisOmClient.open(redisUrl),
    ]);

    // Create a schema for the user entity
    const userSchema = new Schema<UserEntity>("user", {
      name: { type: "string" },
      email: { type: "string" },
      age: { type: "number" },
    });

    // Create transaction manager
    const transactionManager = new TransactionManager<UserEntity>(
      userSchema,
      redisOmClient,
      "user",
      nativeRedisClient
    );

    // Create a sample user entity
    const userEntity: UserEntity = {
      name: "John Doe",
      email: "john.doe@example.com",
      age: 30,
    };

    console.log("\nSaving user entity...");
    // Save the entity
    const savedEntity = await transactionManager.save(userEntity);
    console.log("Saved Entity:", {
      entityId: savedEntity.entityId,
      name: savedEntity.name,
      email: savedEntity.email,
      age: savedEntity.age,
      version: savedEntity.version,
      lastUpdated: savedEntity.lastUpdated,
    });

    // Fetch the saved entity using its unique ID
    console.log("\nFetching saved entity...");
    const fetchedEntity = await transactionManager.fetch(savedEntity.entityId!);
    console.log("Fetched Entity:", {
      entityId: fetchedEntity?.entityId,
      name: fetchedEntity?.name,
      email: fetchedEntity?.email,
      age: fetchedEntity?.age,
    });

    // Remove the entity
    console.log("\nRemoving entity...");
    await transactionManager.remove(savedEntity.entityId!);
    console.log("Entity removed successfully");
  } catch (error) {
    console.error("Error in basic example:", error);
  } finally {
    try {
      // Disconnect clients
      await nativeRedisClient.quit();
      await redisOmClient.close();
      console.log("\nDisconnected from Redis");
    } catch (disconnectError) {
      console.error("Error during disconnection:", disconnectError);
    }
  }
}

// Run the example
basicExample().catch(console.error);
