import { Client } from "redis-om";
import { createClient, RedisClientType } from "redis";
import { PersistenceManager } from "../../src/core/persistence";
import { ErrorRegistry, ErrorCode } from "../../src/errors";
import {
  PersistenceType,
  PersistenceConfig,
  AOFSyncOption,
} from "../../src/interfaces/persistence.interface";

// Define interface for the native client commands we'll mock
interface MockRedisCommands {
  configGet: jest.Mock;
  configSet: jest.Mock;
  info: jest.Mock;
  quit: jest.Mock;
  connect: jest.Mock;
}

// Mock logger
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock the logger module
jest.mock("../../src/logger", () => ({
  ConsoleLogger: jest.fn().mockImplementation(() => mockLogger),
  LogLevel: {
    ERROR: "error",
    WARN: "warn",
    INFO: "info",
    DEBUG: "debug",
  },
}));

describe("PersistenceManager", () => {
  let persistenceManager: PersistenceManager;
  let mockCommands: MockRedisCommands;
  let mockNativeClient: RedisClientType & MockRedisCommands;
  let mockRedisOmClient: Client;
  let _isOpen: boolean;

  beforeEach(() => {
    jest.clearAllMocks();
    _isOpen = true;

    // Create mock commands
    mockCommands = {
      configGet: jest.fn(),
      configSet: jest.fn(),
      info: jest.fn(),
      quit: jest.fn(),
      connect: jest.fn(),
    };

    // Set up default mock implementations
    mockCommands.configGet.mockImplementation(async (...args) => {
      const param = args.length === 2 ? args[1] : args[0];
      const responses: Record<string, any> = {
        save: { save: "" },
        appendonly: { appendonly: "no" },
        appendfsync: { appendfsync: "everysec" },
      };
      return responses[param] || {};
    });

    mockCommands.configSet.mockResolvedValue("OK");
    mockCommands.info.mockResolvedValue(
      "# Persistence\nrdb_bgsave_in_progress:0\naof_rewrite_in_progress:0"
    );
    mockCommands.quit.mockResolvedValue(undefined);
    mockCommands.connect.mockResolvedValue(undefined);

    // Create mock Redis client
    mockNativeClient = {
      ...mockCommands,
      get isOpen() {
        return _isOpen;
      },
    } as unknown as RedisClientType & MockRedisCommands;

    // Create mock Redis-OM client
    mockRedisOmClient = {
      url: "redis://localhost:6379",
      isOpen: true,
    } as unknown as Client;

    persistenceManager = new PersistenceManager(
      mockRedisOmClient,
      mockNativeClient
    );
  });

  describe("setPersistence", () => {
    it("should configure RDB persistence correctly", async () => {
      const config: PersistenceConfig = {
        type: PersistenceType.RDB,
        rdbOptions: {
          saveFrequency: 3600,
        },
      };

      await persistenceManager.setPersistence(config);

      expect(mockCommands.configSet).toHaveBeenCalledWith("save", "3600 1");
      expect(mockCommands.configSet).toHaveBeenCalledWith("appendonly", "no");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Persistence configuration applied successfully",
        "PersistenceManager",
        expect.any(Object)
      );
    });

    it("should configure AOF persistence correctly", async () => {
      const config: PersistenceConfig = {
        type: PersistenceType.AOF,
        aofOptions: {
          appendfsync: AOFSyncOption.EVERYSEC,
        },
      };

      await persistenceManager.setPersistence(config);

      expect(mockCommands.configSet).toHaveBeenCalledWith("appendonly", "yes");
      expect(mockCommands.configSet).toHaveBeenCalledWith(
        "appendfsync",
        "everysec"
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should throw error for invalid persistence type", async () => {
      const invalidConfig = {
        type: "INVALID" as PersistenceType,
      };

      await expect(
        persistenceManager.setPersistence(invalidConfig)
      ).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("getCurrentConfig", () => {
    it("should detect RDB configuration", async () => {
      mockCommands.configGet.mockImplementation(async () => ({
        save: "3600 1",
        appendonly: "no",
        appendfsync: "everysec",
      }));

      const config = await persistenceManager.getCurrentConfig();

      expect(config).toEqual({
        type: PersistenceType.RDB,
        rdbOptions: {
          saveFrequency: 3600,
        },
      });
    });

    it("should detect AOF configuration", async () => {
      mockCommands.configGet.mockImplementation(async () => ({
        save: "",
        appendonly: "yes",
        appendfsync: "everysec",
      }));

      const config = await persistenceManager.getCurrentConfig();

      expect(config).toEqual({
        type: PersistenceType.AOF,
        aofOptions: {
          appendfsync: AOFSyncOption.EVERYSEC,
        },
      });
    });

    it("should handle Redis errors", async () => {
      mockCommands.configGet.mockRejectedValue(new Error("Redis error"));

      await expect(persistenceManager.getCurrentConfig()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("checkPersistenceStatus", () => {
    it("should return correct persistence status", async () => {
      mockCommands.info.mockResolvedValue(
        "# Persistence\n" +
          "rdb_bgsave_in_progress:0\n" +
          "aof_rewrite_in_progress:0\n" +
          "rdb_last_save_time:1234567890\n" +
          "aof_last_rewrite_time:1234567891"
      );

      const status = await persistenceManager.checkPersistenceStatus();

      expect(status).toEqual({
        rdbSaveInProgress: false,
        aofRewriteInProgress: false,
        lastRdbSaveTime: 1234567890,
        lastAofRewriteTime: 1234567891,
      });
    });

    it("should handle Redis errors", async () => {
      mockCommands.info.mockRejectedValue(new Error("Redis error"));

      await expect(
        persistenceManager.checkPersistenceStatus()
      ).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("should disconnect successfully", async () => {
      await persistenceManager.disconnect();
      expect(mockCommands.quit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Native Redis client disconnected successfully",
        "PersistenceManager"
      );
    });

    it("should handle disconnect errors", async () => {
      mockCommands.quit.mockRejectedValue(new Error("Disconnect failed"));

      await expect(persistenceManager.disconnect()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("isConnected", () => {
    it("should return connection status", () => {
      _isOpen = true;
      expect(persistenceManager.isConnected()).toBe(true);

      _isOpen = false;
      expect(persistenceManager.isConnected()).toBe(false);
    });
  });
});
