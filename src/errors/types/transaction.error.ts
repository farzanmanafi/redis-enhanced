import { BaseError } from "./base.error";

export class TransactionError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, "TRANSACTION_ERROR", 500, details);
  }
}

export class EntityNotFoundError extends BaseError {
  constructor(entityId: string, details?: any) {
    super(
      `Entity with id ${entityId} not found`,
      "ENTITY_NOT_FOUND",
      404,
      details
    );
  }
}
