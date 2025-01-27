import {
  EntityNotFoundError,
  TransactionError,
} from "../types/transaction.error";
import { BaseErrorHandler } from "./base.handler";

export class TransactionErrorHandler extends BaseErrorHandler {
  handleError(error: Error): void {
    if (error.message.includes("not found")) {
      throw new EntityNotFoundError(this.extractEntityId(error.message), {
        originalError: error,
      });
    }
    throw new TransactionError(error.message, { originalError: error });
  }

  private extractEntityId(message: string): string {
    // Basic implementation - should be enhanced based on actual error messages
    return message.split(" ").pop() || "unknown";
  }
}
