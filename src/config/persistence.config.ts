import {
  PersistenceType,
  PersistenceConfig,
  AOFSyncOption,
} from "../interfaces/persistence.interface";

export const defaultPersistenceConfig: PersistenceConfig = {
  type: PersistenceType.NONE,
  rdbOptions: {
    saveFrequency: 3600, // 1 hour
  },
  aofOptions: {
    appendfsync: AOFSyncOption.EVERYSEC,
  },
};
