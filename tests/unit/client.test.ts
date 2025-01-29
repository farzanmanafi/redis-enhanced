import { EnhancedRedisClient } from "../../src/core/client";
import { ErrorRegistry, ErrorCode, BaseError } from "../../src/errors";
import { ConsoleLogger, LogLevel } from "../../src/logger";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Mock logger
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

jest.mock("../../src/logger/providers/console.logger", () => {
  return {
    ConsoleLogger: jest.fn().mockImplementation(() => mockLogger),
  };
});

// Mock redis-om Client
const mockRedisOmClient = {
  open: jest.fn(),
  close: jest.fn(),
  fetchRepository: jest.fn(),
  isOpen: true,
};

// Mock redis client
const mockRedisClient = {
  connect: jest.fn(),
  quit: jest.fn(),
  ping: jest.fn(),
  info: jest.fn(),
  flushDb: jest.fn(),
  configGet: jest.fn(),
  configSet: jest.fn(),
  isOpen: true,
};

jest.mock("redis-om", () => ({
  Client: jest.fn().mockImplementation(() => mockRedisOmClient),
  Schema: jest.fn().mockImplementation(() => ({
    entityId: Symbol("entityId"),
    version: { type: "number" },
    lastUpdated: { type: "date" },
  })),
}));

jest.mock("redis", () => ({
  createClient: jest.fn().mockImplementation(() => mockRedisClient),
}));

describe("EnhancedRedisClient", () => {
  let client: EnhancedRedisClient;
  const TEST_CONFIG = {
    url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.TEST_DB || "1"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisOmClient.open.mockResolvedValue(undefined);
    mockRedisOmClient.close.mockResolvedValue(undefined);
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.quit.mockResolvedValue(undefined);
    mockRedisClient.ping.mockResolvedValue("PONG");
    mockRedisClient.info.mockResolvedValue("# Server\nredis_version:6.0.9");
    mockRedisClient.flushDb.mockResolvedValue("OK");

    client = new EnhancedRedisClient(TEST_CONFIG);
  });

  describe("constructor", () => {
    it("should create instance with valid config", () => {
      expect(client).toBeInstanceOf(EnhancedRedisClient);
      expect(ConsoleLogger).toHaveBeenCalledWith(LogLevel.INFO);
    });

    it("should throw INVALID_CONFIG error with invalid URL", () => {
      const expectedError = ErrorRegistry.createError(
        ErrorCode.INVALID_CONFIG,
        {
          message: "Invalid Redis URL format",
          url: "invalid-url",
        }
      );

      expect(() => {
        new EnhancedRedisClient({ url: "invalid-url" });
      }).toThrow(expectedError);
    });
  });

  describe("connect", () => {
    it("should connect successfully and log the connection", async () => {
      await client.connect();

      expect(mockRedisOmClient.open).toHaveBeenCalled();
      expect(client.getConnectionStatus()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Successfully connected to Redis",
        "EnhancedRedisClient"
      );
    });

    it("should handle connection errors properly", async () => {
      const connectionError = new Error("Connection failed");
      mockRedisOmClient.open.mockRejectedValue(connectionError);

      const expectedError = ErrorRegistry.createError(
        ErrorCode.REDIS_CONNECTION_ERROR,
        {
          error: {
            message: connectionError.message,
            name: connectionError.name,
            stack: connectionError.stack,
          },
        }
      );

      await expect(client.connect()).rejects.toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to connect to Redis",
        "EnhancedRedisClient",
        expect.any(Object)
      );
    });
  });

  describe("disconnect", () => {
    it("should disconnect successfully and log the disconnection", async () => {
      await client.connect();
      await client.disconnect();

      expect(mockRedisOmClient.close).toHaveBeenCalled();
      expect(client.getConnectionStatus()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Successfully disconnected from Redis",
        "EnhancedRedisClient"
      );
    });

    it("should handle disconnect errors properly", async () => {
      await client.connect();
      const disconnectError = new Error("Disconnect failed");
      mockRedisOmClient.close.mockRejectedValue(disconnectError);

      const expectedError = ErrorRegistry.createError(
        ErrorCode.REDIS_CONNECTION_ERROR,
        {
          operation: "disconnect",
          error: {
            message: disconnectError.message,
            name: disconnectError.name,
            stack: disconnectError.stack,
          },
        }
      );

      await expect(client.disconnect()).rejects.toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to disconnect from Redis",
        "EnhancedRedisClient",
        expect.any(Object)
      );
    });
  });

  describe("getServerInfo", () => {
    it("should return parsed server info when connected", async () => {
      await client.connect();
      const info = await client.getServerInfo();
      expect(info).toHaveProperty("server");
      expect(info.server).toHaveProperty("redis_version", "6.0.9");
    });

    it("should throw proper error when not connected", async () => {
      await expect(client.getServerInfo()).rejects.toMatchObject({
        code: ErrorCode.REDIS_OPERATION_ERROR,
        message: "Redis operation failed",
        statusCode: 500,
      });
    });

    it("should handle and log server info errors", async () => {
      await client.connect();
      const infoError = new Error("Info command failed");
      mockRedisClient.info.mockRejectedValue(infoError);

      const expectedError = ErrorRegistry.createError(
        ErrorCode.REDIS_OPERATION_ERROR,
        {
          operation: "getServerInfo",
          error: {
            message: infoError.message,
            name: infoError.name,
            stack: infoError.stack,
          },
        }
      );

      await expect(client.getServerInfo()).rejects.toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to get server info",
        "EnhancedRedisClient",
        expect.any(Object)
      );
    });
  });

  describe("flushDb", () => {
    it("should flush database successfully when connected", async () => {
      await client.connect();
      await client.flushDb();

      expect(mockRedisClient.flushDb).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Successfully flushed database",
        "EnhancedRedisClient"
      );
    });

    it("should throw proper error when not connected", async () => {
      await expect(client.flushDb()).rejects.toMatchObject({
        code: ErrorCode.REDIS_OPERATION_ERROR,
        message: "Redis operation failed",
        statusCode: 500,
      });
    });

    it("should handle and log flush errors", async () => {
      await client.connect();
      const flushError = new Error("Flush failed");
      mockRedisClient.flushDb.mockRejectedValue(flushError);

      const expectedError = ErrorRegistry.createError(
        ErrorCode.REDIS_OPERATION_ERROR,
        {
          operation: "flushDb",
          error: {
            message: flushError.message,
            name: flushError.name,
            stack: flushError.stack,
          },
        }
      );

      await expect(client.flushDb()).rejects.toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to flush database",
        "EnhancedRedisClient",
        expect.any(Object)
      );
    });
  });

  describe("ping", () => {
    it("should return true when connection is alive", async () => {
      await client.connect();
      const result = await client.ping();
      expect(result).toBe(true);
    });

    it("should return false and log error when ping fails", async () => {
      await client.connect();
      const pingError = new Error("Ping failed");
      mockRedisClient.ping.mockRejectedValue(pingError);

      const result = await client.ping();
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to ping Redis",
        "EnhancedRedisClient",
        expect.any(Object)
      );
    });

    it("should return false when not connected", async () => {
      const result = await client.ping();
      expect(result).toBe(false);
    });
  });
});
