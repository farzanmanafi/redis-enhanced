// examples/basic-usage.ts
import * as dotenv from "dotenv";
dotenv.config();
import { EnhancedRedisClient } from "../src";
import { ENV } from "../src/config/env.config";
import { validateEnv } from "../src/utils/env.validator";

async function basicExample() {
  validateEnv(); // Add validation before creating config

  const config = {
    url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  };
  const client = new EnhancedRedisClient(config);

  try {
    await client.connect();

    const transactionManager = client.getTransactionManager();

    const savedEntity = await transactionManager.save({
      name: "example",
      value: 42,
    });

    const fetchedEntity = await transactionManager.fetch(savedEntity.entityId!);

    await transactionManager.remove(savedEntity.entityId!);

    await client.disconnect();
  } catch (error) {
    console.error("Error:", error);
    if (client) {
      await client.disconnect();
    }
  }
}

basicExample().catch(console.error);
