import { BaseError } from "./base.error";

export class PersistenceConfigError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, "PERSISTENCE_CONFIG_ERROR", 400, details);
  }
}

export class PersistenceOperationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, "PERSISTENCE_OPERATION_ERROR", 500, details);
  }
}
