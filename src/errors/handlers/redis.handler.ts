import {
  RedisConnectionError,
  RedisOperationError,
} from "../types/redis.error";
import { BaseErrorHandler } from "./base.handler";

export class RedisErrorHandler extends BaseErrorHandler {
  handleError(error: Error): void {
    if (error.message.includes("connection")) {
      throw new RedisConnectionError(error.message, { originalError: error });
    }
    throw new RedisOperationError(error.message, { originalError: error });
  }
}
