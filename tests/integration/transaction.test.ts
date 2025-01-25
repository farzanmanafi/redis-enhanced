import { Client, Schema, Repository, Entity } from "redis-om";
import { createClient } from "redis";
import { TransactionManager } from "../../src/core/transaction";

const REDIS_URL = "redis://default:123456@localhost:6380";

interface TestEntity extends Entity {
  name: string;
  value: number;
  entityId?: string;
}

describe("TransactionManager Integration", () => {
  let client: Client;
  let nativeRedisClient: ReturnType<typeof createClient>;
  let manager: TransactionManager<TestEntity>;
  let schema: Schema<TestEntity>;
  let repository: Repository<TestEntity>;

  beforeAll(async () => {
    client = new Client();
    nativeRedisClient = createClient({ url: REDIS_URL });

    await nativeRedisClient.connect();
    await client.open(REDIS_URL);

    schema = new Schema(
      "test",
      {
        name: { type: "string" },
        value: { type: "number" },
      },
      { dataStructure: "HASH" }
    );

    repository = client.fetchRepository(schema);
    manager = new TransactionManager<TestEntity>(schema, client, "test");
  }, 60000);

  afterAll(async () => {
    await nativeRedisClient.flushDb();
    await manager.disconnect();
    await nativeRedisClient.quit();
    await client.close();
  }, 30000);

  test("basic save and fetch", async () => {
    const entityId = `test-${Date.now()}`;
    const testEntity = {
      entityId,
      name: "test entity",
      value: 42,
    };

    await repository.save(entityId, testEntity);
    const fetchedEntity = await manager.fetch(entityId);

    expect(fetchedEntity).toBeTruthy();
    expect(fetchedEntity?.name).toBe("test entity");
    expect(fetchedEntity?.value).toBe(42);
  });
});
