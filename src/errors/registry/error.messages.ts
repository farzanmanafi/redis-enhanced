import { ErrorCode } from "./error.codes";

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.REDIS_CONNECTION_ERROR]: "Failed to establish Redis connection",
  [ErrorCode.REDIS_OPERATION_ERROR]: "Redis operation failed",
  [ErrorCode.REDIS_AUTH_ERROR]: "Redis authentication failed",
  [ErrorCode.REDIS_TIMEOUT_ERROR]: "Redis operation timed out",

  [ErrorCode.PERSISTENCE_CONFIG_ERROR]: "Invalid persistence configuration",
  [ErrorCode.PERSISTENCE_OPERATION_ERROR]: "Persistence operation failed",
  [ErrorCode.PERSISTENCE_SAVE_ERROR]: "Failed to save data",
  [ErrorCode.PERSISTENCE_LOAD_ERROR]: "Failed to load data",

  [ErrorCode.TRANSACTION_ERROR]: "Transaction failed",
  [ErrorCode.TRANSACTION_COMMIT_ERROR]: "Failed to commit transaction",
  [ErrorCode.TRANSACTION_ROLLBACK_ERROR]: "Failed to rollback transaction",
  [ErrorCode.ENTITY_NOT_FOUND]: "Entity not found",

  [ErrorCode.VALIDATION_ERROR]: "Validation failed",
  [ErrorCode.INVALID_CONFIG]: "Invalid configuration",
  [ErrorCode.INVALID_PARAMETER]: "Invalid parameter",

  [ErrorCode.SYSTEM_ERROR]: "System error occurred",
  [ErrorCode.UNEXPECTED_ERROR]: "An unexpected error occurred",
};
