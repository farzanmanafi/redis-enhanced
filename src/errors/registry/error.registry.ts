import { ErrorCode } from "./error.codes";
import { BaseError } from "../types/base.error";
import { ErrorMessages } from "./error.messages";

export class ErrorRegistry {
  static getErrorMessage(code: ErrorCode): string {
    return ErrorMessages[code] || "Unknown error";
  }

  static createError(code: ErrorCode, details?: any): BaseError {
    const message = this.getErrorMessage(code);
    return new BaseError(message, code, this.getStatusCode(code), details);
  }

  private static getStatusCode(code: ErrorCode): number {
    const category = parseInt(code.charAt(0));
    switch (category) {
      case 1: // Redis errors
      case 2: // Persistence errors
      case 5: // System errors
        return 500;
      case 3: // Transaction errors
        return code === ErrorCode.ENTITY_NOT_FOUND ? 404 : 500;
      case 4: // Validation errors
        return 400;
      default:
        return 500;
    }
  }
}
