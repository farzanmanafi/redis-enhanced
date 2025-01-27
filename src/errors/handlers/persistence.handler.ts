import {
  PersistenceConfigError,
  PersistenceOperationError,
} from "../types/persistence.error";
import { BaseErrorHandler } from "./base.handler";

export class PersistenceErrorHandler extends BaseErrorHandler {
  handleError(error: Error): void {
    if (error.message.includes("config")) {
      throw new PersistenceConfigError(error.message, { originalError: error });
    }
    throw new PersistenceOperationError(error.message, {
      originalError: error,
    });
  }
}
