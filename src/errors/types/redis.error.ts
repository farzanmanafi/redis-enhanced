import { BaseError } from "./base.error";

export class RedisConnectionError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, "REDIS_CONNECTION_ERROR", 500, details);
  }
}

export class RedisOperationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, "REDIS_OPERATION_ERROR", 500, details);
  }
}
