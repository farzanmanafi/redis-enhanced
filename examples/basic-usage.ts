import { EnhancedRedisClient } from "../src";

async function basicExample() {
  try {
    const client = new EnhancedRedisClient({
      url: "redis://default:123456@localhost:6380",
    });

    try {
      await client.connect();
    } catch (connectionError) {
      console.error("Failed to connect to Redis:", connectionError);
      return; // Exit gracefully if connection fails
    }

    const transactionManager = client.getTransactionManager();

    const savedEntity = await transactionManager.save({
      name: "example",
      value: 42,
    });

    console.log("Saved Entity:", savedEntity);

    const fetchedEntity = await transactionManager.fetch(savedEntity.entityId!);

    console.log("Fetched Entity:", fetchedEntity);

    await transactionManager.remove(savedEntity.entityId!);

    console.log("Entity removed successfully");

    await client.disconnect();
  } catch (error) {
    console.error("Detailed Redis operation error:", error);
  }
}

basicExample().catch(console.error);
