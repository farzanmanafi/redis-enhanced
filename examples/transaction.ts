import * as dotenv from "dotenv";
dotenv.config();

import { Client, Schema, Repository, Entity } from "redis-om";
import { createClient } from "redis";
import { TransactionManager } from "../src/core/transaction";
import { ENV } from "../src/config/env.config";
import { validateEnv } from "../src/utils/env.validator";

interface EntityData extends Entity {
  [key: string]: any;
  version?: number;
  lastUpdated?: Date;
  entityId?: string;
}

async function transactionExample() {
  validateEnv();

  const REDIS_URL = `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  const redisClient = createClient({
    url: REDIS_URL,
  });

  const client = new Client();

  try {
    await redisClient.connect();
    await client.open(
      `redis://${ENV.redis.username}:${ENV.redis.password}@${ENV.redis.host}:${ENV.redis.port}`
    );

    const schema = new Schema("test", {
      name: { type: "string" },
      value: { type: "number" },
    });

    const transactionManager = new TransactionManager<EntityData>(
      schema,
      client,
      "test" // Add the schemaName here
    );

    const savedEntity = await transactionManager.save({
      name: "John",
      email: "john@example.com",
    });

    console.log("Saved Entity:", savedEntity);

    await redisClient.quit();
    await client.close();
  } catch (error) {
    console.error("Connection or transaction error:", error);
  }
}

transactionExample().catch(console.error);
