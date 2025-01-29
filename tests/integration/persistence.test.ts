import { Client } from "redis-om";
import { createClient } from "redis";
import { PersistenceManager } from "../../src/core/persistence";
import {
  PersistenceType,
  AOFSyncOption,
  PersistenceConfig,
} from "../../src/interfaces/persistence.interface";
import { ErrorCode } from "../../src/errors";
import { TEST_REDIS_URL } from "./setup";

describe("PersistenceManager Integration", () => {
  let omClient: Client;
  let manager: PersistenceManager;
  let nativeRedisClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // Initialize Redis clients
    try {
      nativeRedisClient = createClient({
        url: TEST_REDIS_URL,
      });

      omClient = new Client();

      // Connect both clients
      await Promise.all([
        nativeRedisClient.connect(),
        omClient.open(TEST_REDIS_URL),
      ]);

      // Create manager after clients are connected
      manager = new PersistenceManager(omClient, nativeRedisClient);
    } catch (error) {
      console.error("Setup error:", error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    try {
      // Cleanup in reverse order
      if (nativeRedisClient?.isOpen) {
        await nativeRedisClient.quit();
      }
      if (omClient) {
        await omClient.close();
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }, 10000);

  describe("Persistence Configuration", () => {
    beforeEach(async () => {
      // Reset Redis configuration before each test
      if (!nativeRedisClient.isOpen) {
        await nativeRedisClient.connect();
      }

      await nativeRedisClient.configSet("save", "");
      await nativeRedisClient.configSet("appendonly", "no");
      await nativeRedisClient.configSet("appendfsync", "everysec");

      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    test("should configure RDB persistence with valid options", async () => {
      const config: PersistenceConfig = {
        type: PersistenceType.RDB,
        rdbOptions: {
          saveFrequency: 3600,
        },
      };

      await manager.setPersistence(config);
      const save = await nativeRedisClient.configGet("save");
      expect(save.save).toBe("3600 1");
    }, 10000);

    test("should configure AOF persistence with valid options", async () => {
      const config: PersistenceConfig = {
        type: PersistenceType.AOF,
        aofOptions: {
          appendfsync: AOFSyncOption.EVERYSEC,
        },
      };

      await manager.setPersistence(config);

      const [appendonly, appendfsync] = await Promise.all([
        nativeRedisClient.configGet("appendonly"),
        nativeRedisClient.configGet("appendfsync"),
      ]);

      expect(appendonly.appendonly).toBe("yes");
      expect(appendfsync.appendfsync).toBe("everysec");
    }, 10000);

    test("should disable persistence when type is NONE", async () => {
      const config: PersistenceConfig = {
        type: PersistenceType.NONE,
      };

      await manager.setPersistence(config);

      const [save, appendonly] = await Promise.all([
        nativeRedisClient.configGet("save"),
        nativeRedisClient.configGet("appendonly"),
      ]);

      expect(save.save).toBe("");
      expect(appendonly.appendonly).toBe("no");
    }, 10000);

    test("should reject invalid persistence type", async () => {
      const config = {
        type: "INVALID" as PersistenceType,
      };

      await expect(manager.setPersistence(config)).rejects.toMatchObject({
        code: ErrorCode.INVALID_CONFIG,
      });
    });

    test("should reject RDB configuration without save frequency", async () => {
      const config: PersistenceConfig = {
        type: PersistenceType.RDB,
      };

      await expect(manager.setPersistence(config)).rejects.toMatchObject({
        code: ErrorCode.INVALID_CONFIG,
      });
    });
  });

  describe("Persistence Status", () => {
    test("should retrieve correct persistence status", async () => {
      const status = await manager.checkPersistenceStatus();

      expect(status).toHaveProperty("rdbSaveInProgress");
      expect(status).toHaveProperty("aofRewriteInProgress");
      expect(status).toHaveProperty("lastRdbSaveTime");
      expect(status).toHaveProperty("lastAofRewriteTime");

      expect(typeof status.rdbSaveInProgress).toBe("boolean");
      expect(typeof status.aofRewriteInProgress).toBe("boolean");
    });
  });

  describe("Current Configuration", () => {
    test("should detect when no persistence is configured", async () => {
      // Disable all persistence
      await manager.setPersistence({ type: PersistenceType.NONE });

      const config = await manager.getCurrentConfig();
      expect(config.type).toBe(PersistenceType.NONE);
      expect(config.rdbOptions).toBeUndefined();
      expect(config.aofOptions).toBeUndefined();
    });
  });
});
