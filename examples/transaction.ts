import { Client, Schema, Repository, Entity } from "redis-om";
import { createClient } from "redis";
import { TransactionManager } from "../src/core/transaction";

interface EntityData extends Entity {
  [key: string]: any;
  version?: number;
  lastUpdated?: Date;
  entityId?: string;
}

async function transactionExample() {
  const redisClient = createClient({
    url: "redis://127.0.0.1:6380",
    password: "123456",
  });

  const client = new Client();

  try {
    await redisClient.connect();
    console.log("Redis client connected");

    await client.open("redis://:123456@127.0.0.1:6380");
    console.log("Redis-OM client opened");

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
