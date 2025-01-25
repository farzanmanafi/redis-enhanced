export enum PersistenceType {
  NONE = "NONE",
  RDB = "RDB",
  AOF = "AOF",
}

export enum AOFSyncOption {
  ALWAYS = "always",
  EVERYSEC = "everysec",
  NO = "no",
}

export interface RDBOptions {
  saveFrequency: number;
}

export interface AOFOptions {
  appendfsync: AOFSyncOption;
}

export interface PersistenceConfig {
  type: PersistenceType;
  rdbOptions?: RDBOptions;
  aofOptions?: AOFOptions;
}
