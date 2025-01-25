import { EnhancedRedisClient } from "../../src/core/client";
import { defaultRedisConfig } from "../../src/config/redis.config";
import { Client } from "redis-om";

// Mock redis-om Client
jest.mock("redis-om", () => ({
  Client: jest.fn().mockImplementation(() => ({
    fetchRepository: jest.fn(),
    open: jest.fn(),
  })),
  Schema: jest.fn().mockImplementation(() => ({})),
}));

describe("EnhancedRedisClient", () => {
  let client: EnhancedRedisClient;

  beforeEach(() => {
    client = new EnhancedRedisClient(defaultRedisConfig);
  });

  test("should create instance with default config", () => {
    expect(client).toBeInstanceOf(EnhancedRedisClient);
  });

  test("should throw error when URL is missing", () => {
    expect(() => new EnhancedRedisClient({ url: "" })).toThrow(
      "Redis URL is required"
    );
  });

  test("should provide access to persistence manager", () => {
    const persistence = client.getPersistenceManager();
    expect(persistence).toBeDefined();
  });

  test("should provide access to transaction manager", async () => {
    await client.connect(); // Add this line to mock connection
    const transactionManager = client.getTransactionManager();
    expect(transactionManager).toBeDefined();
  });
});
