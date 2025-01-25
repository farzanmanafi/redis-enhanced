import { TransactionManager } from "../../src/core/transaction";
import { Client, Schema, Repository, Entity } from "redis-om";
import { EntityData } from "../../src/interfaces/entity.interface";
import { createClient } from "redis";

const mockSave = jest.fn();
const mockFetch = jest.fn();
const mockRemove = jest.fn();
const mockQuit = jest.fn().mockResolvedValue(undefined);

jest.mock("redis-om", () => ({
  Client: jest.fn().mockImplementation(() => ({
    fetchRepository: jest.fn().mockReturnValue({
      save: mockSave,
      fetch: mockFetch,
      remove: mockRemove,
    }),
    execute: jest.fn().mockResolvedValue({}),
  })),
  Schema: jest.fn().mockImplementation(() => ({})),
  Repository: jest.fn().mockImplementation(() => ({
    save: mockSave,
    fetch: mockFetch,
    remove: mockRemove,
  })),
}));

jest.mock("redis", () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: mockQuit,
    isOpen: true, // Explicitly set isOpen to true
  })),
}));

describe("TransactionManager", () => {
  let manager: TransactionManager<EntityData>;
  let mockClient: jest.Mocked<InstanceType<typeof Client>>;
  let mockSchema: InstanceType<typeof Schema>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new Client() as jest.Mocked<InstanceType<typeof Client>>;
    mockSchema = new Schema("test", {});

    manager = new TransactionManager(mockSchema, mockClient, "test");
  });

  // ... other tests ...

  test("should handle disconnect", async () => {
    await manager.disconnect();

    expect(mockQuit).toHaveBeenCalled();
  });
});
