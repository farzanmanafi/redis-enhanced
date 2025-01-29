import { Client, Schema, Repository } from "redis-om";
import { RedisClientType } from "redis";
import { TransactionManager } from "../../src/core/transaction";
import { ErrorCode } from "../../src/errors";
import { EntityData } from "../../src/interfaces/entity.interface";

// Mock logger
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock error handler
const mockErrorHandler = {
  handleError: jest.fn(),
};

// Mock implementations
jest.mock("../../src/logger", () => ({
  ConsoleLogger: jest.fn().mockImplementation(() => mockLogger),
  LogLevel: {
    ERROR: "error",
    WARN: "warn",
    INFO: "info",
    DEBUG: "debug",
  },
}));

jest.mock("../../src/errors/handlers/transaction.handler", () => ({
  TransactionErrorHandler: jest.fn().mockImplementation(() => mockErrorHandler),
}));

describe("TransactionManager", () => {
  let transactionManager: TransactionManager<EntityData>;
  let mockRepository: jest.Mocked<Repository>;
  let mockClient: jest.Mocked<Client>;
  let testSchema: Schema;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Repository
    mockRepository = {
      save: jest.fn(),
      fetch: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository>;

    // Create mock Client
    mockClient = {
      fetchRepository: jest.fn().mockReturnValue(mockRepository),
      isOpen: true,
    } as unknown as jest.Mocked<Client>;

    // Create test schema
    testSchema = new Schema("test", {
      name: { type: "string" },
      value: { type: "number" },
    });
  });

  describe("remove", () => {
    const entityId = "test123";

    it("should remove entity successfully", async () => {
      // Create mock functions with proper typing
      const mockKeys = jest.fn();
      const mockDel = jest.fn();
      const mockPing = jest.fn().mockResolvedValue("PONG");

      // Setup mock responses
      const existingKeys = [`test:${entityId}`];

      // Setup mock implementation for keys
      mockKeys
        .mockImplementationOnce(() => Promise.resolve(existingKeys)) // First call (fetch check)
        .mockImplementationOnce(() => Promise.resolve(existingKeys)) // Second call (remove check)
        .mockImplementationOnce(() => Promise.resolve([])); // Third call (verification)

      // Setup mock implementation for del
      mockDel.mockImplementation(() => Promise.resolve(1)); // Successful deletion

      // Create mock Redis client that matches ExtendedRedisClient interface
      const mockRedisClient = {
        isOpen: true,
        ping: mockPing,
        multi: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
        discard: jest.fn().mockResolvedValue(undefined),
        keys: mockKeys,
        del: mockDel,
        quit: jest.fn().mockResolvedValue(undefined),
      };

      // Mock entity for Repository's fetch with proper array return
      const mockEntityData = [
        {
          entityId,
          name: "test",
          value: 123,
          version: 1,
          [Symbol.for("entityId")]: entityId,
        },
      ];

      mockRepository.fetch.mockImplementation(() =>
        Promise.resolve(mockEntityData)
      );

      // Create TransactionManager instance
      transactionManager = new TransactionManager<EntityData>(
        testSchema,
        mockClient,
        "test",
        mockRedisClient as unknown as RedisClientType
      );

      // Execute remove operation
      await transactionManager.remove(entityId);

      // Verify all operations
      const keyPattern = `test:${entityId}*`;

      // Check that keys was called with correct pattern
      expect(mockKeys).toHaveBeenCalledWith(keyPattern);

      // Check that del was called with the correct keys array
      expect(mockDel).toHaveBeenCalledWith(existingKeys);

      // Check that repository remove was called
      expect(mockRepository.remove).toHaveBeenCalledWith(entityId);

      // Verify successful operation was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Entity removed successfully",
        "TransactionManager",
        { entityId }
      );
    });
  });

  describe("transaction operations", () => {
    describe("beginTransaction", () => {
      it("should prevent multiple concurrent transactions", async () => {
        // Create mock functions
        const mockMulti = jest.fn();

        // Create mock Redis client
        const mockRedisClient = {
          isOpen: true,
          ping: jest.fn().mockResolvedValue("PONG"),
          multi: mockMulti.mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
          discard: jest.fn().mockResolvedValue(undefined),
          keys: jest.fn().mockResolvedValue([]),
          del: jest.fn().mockResolvedValue(1),
          quit: jest.fn().mockResolvedValue(undefined),
        };

        // Create TransactionManager instance
        transactionManager = new TransactionManager<EntityData>(
          testSchema,
          mockClient,
          "test",
          mockRedisClient as unknown as RedisClientType
        );

        // First transaction succeeds
        await transactionManager.beginTransaction();

        // Second transaction should fail
        await expect(
          transactionManager.beginTransaction()
        ).rejects.toMatchObject({
          message: "Transaction failed",
          code: ErrorCode.TRANSACTION_ERROR,
          details: {
            error: {
              message: "A transaction is already in progress",
            },
          },
        });
      });
    });

    describe("commitTransaction", () => {
      it("should commit transaction successfully", async () => {
        const mockRedisClient = {
          isOpen: true,
          ping: jest.fn().mockResolvedValue("PONG"),
          multi: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
          discard: jest.fn().mockResolvedValue(undefined),
          keys: jest.fn().mockResolvedValue([]),
          del: jest.fn().mockResolvedValue(1),
          quit: jest.fn().mockResolvedValue(undefined),
        };

        transactionManager = new TransactionManager<EntityData>(
          testSchema,
          mockClient,
          "test",
          mockRedisClient as unknown as RedisClientType
        );

        await transactionManager.beginTransaction();
        await transactionManager.commitTransaction();

        expect(mockRedisClient.exec).toHaveBeenCalled();
      });
    });

    describe("rollbackTransaction", () => {
      it("should rollback transaction successfully", async () => {
        const mockRedisClient = {
          isOpen: true,
          ping: jest.fn().mockResolvedValue("PONG"),
          multi: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
          discard: jest.fn().mockResolvedValue(undefined),
          keys: jest.fn().mockResolvedValue([]),
          del: jest.fn().mockResolvedValue(1),
          quit: jest.fn().mockResolvedValue(undefined),
        };

        transactionManager = new TransactionManager<EntityData>(
          testSchema,
          mockClient,
          "test",
          mockRedisClient as unknown as RedisClientType
        );

        await transactionManager.beginTransaction();
        await transactionManager.rollbackTransaction();

        expect(mockRedisClient.discard).toHaveBeenCalled();
      });
    });
  });
});
