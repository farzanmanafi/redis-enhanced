import { PersistenceManager } from "../../src/core/persistence";
import { Client } from "redis-om";
import {
  PersistenceType,
  AOFSyncOption,
} from "../../src/interfaces/persistence.interface";

jest.mock("redis-om", () => ({
  Client: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockResolvedValue(undefined),
  })),
}));
describe("PersistenceManager", () => {
  let manager: PersistenceManager;
  let mockClient: jest.Mocked<InstanceType<typeof Client>>;

  beforeEach(() => {
    mockClient = new Client() as jest.Mocked<InstanceType<typeof Client>>;
    manager = new PersistenceManager(mockClient);
  });

  test("should set RDB persistence", async () => {
    const config = {
      type: PersistenceType.RDB,
      rdbOptions: { saveFrequency: 3600 },
    };

    await manager.setPersistence(config);
    expect(mockClient.set).toHaveBeenCalledWith("save", "3600 1");
  });

  test("should set AOF persistence", async () => {
    const config = {
      type: PersistenceType.AOF,
      aofOptions: { appendfsync: AOFSyncOption.ALWAYS },
    };

    await manager.setPersistence(config);
    expect(mockClient.set).toHaveBeenCalledWith("appendonly", "yes");
    expect(mockClient.set).toHaveBeenCalledWith("appendfsync", "always");
  });
});
