import { Client, Schema, Repository, Entity } from "redis-om";
import { createClient } from "redis";
import { TransactionManager } from "../../src/core/transaction";
import { ErrorCode } from "../../src/errors";
import { TEST_REDIS_URL } from "./setup";

// Define an interface for test entities
interface TestEntity extends Entity {
  name: string;
  value: number;
  email?: string;
  entityId?: string;
}

describe("TransactionManager Integration", () => {
  let client: Client;
  let nativeRedisClient: ReturnType<typeof createClient>;
  let manager: TransactionManager<TestEntity>;
  let schema: Schema<TestEntity>;
  let repository: Repository<TestEntity>;

  beforeAll(async () => {
    try {
      // Create native Redis client
      nativeRedisClient = createClient({
        url: TEST_REDIS_URL,
      });

      // Create Redis-OM client
      client = new Client();

      // Connect both clients
      await Promise.all([
        nativeRedisClient.connect(),
        client.open(TEST_REDIS_URL),
      ]);

      // Create schema
      schema = new Schema<TestEntity>(
        "test",
        {
          name: { type: "string" },
          value: { type: "number" },
          email: { type: "string" },
        },
        { dataStructure: "HASH" }
      );

      // Create repository
      repository = client.fetchRepository(schema);

      // Create transaction manager with native client
      manager = new TransactionManager<TestEntity>(
        schema,
        client,
        "test",
        nativeRedisClient
      );

      // Wait to ensure stable connection
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Setup error:", error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    try {
      // Cleanup in reverse order
      if (nativeRedisClient?.isOpen) {
        await nativeRedisClient.flushDb();
        await nativeRedisClient.quit();
      }

      if (client) {
        await client.close();
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }, 10000);

  beforeEach(async () => {
    // Ensure client is connected and database is flushed before each test
    if (!nativeRedisClient.isOpen) {
      await nativeRedisClient.connect();
    }
    await nativeRedisClient.flushDb();
  }, 10000);

  test("should save and fetch an entity", async () => {
    // Prepare test entity
    const testEntity: TestEntity = {
      name: "John Doe",
      value: 42,
      email: "john@example.com",
    };

    // Save the entity
    const savedEntity = await manager.save(testEntity);

    // Verify saved entity
    expect(savedEntity).toBeTruthy();
    expect(savedEntity.name).toBe("John Doe");
    expect(savedEntity.value).toBe(42);
    expect(savedEntity.email).toBe("john@example.com");
    expect(savedEntity.entityId).toBeDefined();
    expect(savedEntity.version).toBe(1);
    expect(savedEntity.lastUpdated).toBeInstanceOf(Date);

    // Fetch the saved entity
    const fetchedEntity = await manager.fetch(savedEntity.entityId!);

    // Verify fetched entity matches saved entity
    expect(fetchedEntity).toBeTruthy();
    expect(fetchedEntity?.name).toBe("John Doe");
    expect(fetchedEntity?.value).toBe(42);
    expect(fetchedEntity?.email).toBe("john@example.com");
    expect(fetchedEntity?.entityId).toBe(savedEntity.entityId);
  }, 10000);

  test("should update an existing entity", async () => {
    // Prepare initial entity
    const initialEntity: TestEntity = {
      name: "Initial Entity",
      value: 100,
    };

    // Save initial entity
    const savedEntity = await manager.save(initialEntity);

    // Update entity
    const updatedEntity = await manager.save({
      ...savedEntity,
      value: 200,
    });

    // Verify update
    expect(updatedEntity.value).toBe(200);
    expect(updatedEntity.version).toBe(2);
    expect(updatedEntity.entityId).toBe(savedEntity.entityId);
  }, 10000);

  test("should remove an existing entity", async () => {
    // Prepare test entity
    const testEntity: TestEntity = {
      name: "Remove Test",
      value: 999,
    };

    // Save entity
    const savedEntity = await manager.save(testEntity);

    // Remove entity
    await manager.remove(savedEntity.entityId!);

    // Try to fetch removed entity (should throw ENTITY_NOT_FOUND error)
    await expect(manager.fetch(savedEntity.entityId!)).rejects.toMatchObject({
      code: ErrorCode.ENTITY_NOT_FOUND,
    });
  }, 10000);

  test("should handle multiple entity operations", async () => {
    const entities: TestEntity[] = [
      { name: "Entity 1", value: 10 },
      { name: "Entity 2", value: 20 },
      { name: "Entity 3", value: 30 },
    ];

    // Save multiple entities
    const savedEntities = await Promise.all(
      entities.map((entity) => manager.save(entity))
    );

    // Verify saved entities
    expect(savedEntities.length).toBe(3);

    // Fetch and verify each entity
    for (const savedEntity of savedEntities) {
      const fetchedEntity = await manager.fetch(savedEntity.entityId!);
      expect(fetchedEntity).toBeTruthy();
      expect(fetchedEntity?.name).toContain("Entity");
    }
  }, 20000);
});
