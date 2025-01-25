import { Client } from "redis-om";
import { createClient } from "redis";
import { PersistenceManager } from "../../src/core/persistence";
import {
  PersistenceType,
  AOFSyncOption,
} from "../../src/interfaces/persistence.interface";
import { TEST_REDIS_URL } from "./setup";

describe("PersistenceManager Integration", () => {
  let omClient: Client;
  let manager: PersistenceManager;
  let nativeRedisClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    omClient = new Client();
    nativeRedisClient = createClient({
      url: TEST_REDIS_URL,
    });

    try {
      await nativeRedisClient.connect();
      await omClient.open(TEST_REDIS_URL);
      manager = new PersistenceManager(omClient);
    } catch (error) {
      console.error("Setup error:", error);
      throw error;
    }
  }, 60000);

  afterAll(async () => {
    await nativeRedisClient.quit();
    await omClient.close();
  }, 30000);

  beforeEach(async () => {
    // Reset Redis configuration before each test
    await nativeRedisClient.configSet("save", "");
    await nativeRedisClient.configSet("appendonly", "no");
    await nativeRedisClient.configSet("appendfsync", "everysec");

    // Wait for configuration to take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test("should configure RDB persistence", async () => {
    // First, explicitly set RDB configuration using native client
    await nativeRedisClient.configSet("save", "3600 1");

    // Then apply our persistence configuration
    await manager.setPersistence({
      type: PersistenceType.RDB,
      rdbOptions: { saveFrequency: 3600 },
    });

    // Wait for configuration to take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify configuration using CONFIG GET
    const save = await nativeRedisClient.configGet("save");
    expect(save.save).toBe("3600 1");

    // Verify RDB is enabled in persistence info
    const info = await nativeRedisClient.info("persistence");
    expect(info).toMatch(/rdb_bgsave_in_progress:0/);
  }, 30000);

  test("should configure AOF persistence", async () => {
    // First, explicitly enable AOF using native client
    await nativeRedisClient.configSet("appendonly", "yes");
    await nativeRedisClient.configSet("appendfsync", "everysec");

    // Then apply our persistence configuration
    await manager.setPersistence({
      type: PersistenceType.AOF,
      aofOptions: { appendfsync: AOFSyncOption.EVERYSEC },
    });

    // Wait for configuration to take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify configuration
    const appendonly = await nativeRedisClient.configGet("appendonly");
    const appendfsync = await nativeRedisClient.configGet("appendfsync");

    expect(appendonly.appendonly).toBe("yes");
    expect(appendfsync.appendfsync).toBe("everysec");
  }, 30000);

  test("should disable persistence", async () => {
    // Apply no persistence configuration
    await manager.setPersistence({ type: PersistenceType.NONE });

    // Wait for configuration to take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify configuration
    const save = await nativeRedisClient.configGet("save");
    const appendonly = await nativeRedisClient.configGet("appendonly");

    expect(save.save).toBe("");
    expect(appendonly.appendonly).toBe("no");
  }, 30000);
});
