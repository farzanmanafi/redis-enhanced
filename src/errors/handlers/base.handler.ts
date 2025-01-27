import { BaseError } from "../types/base.error";

export interface ErrorHandler {
  handleError(error: Error | BaseError): void;
}

export abstract class BaseErrorHandler implements ErrorHandler {
  abstract handleError(error: Error | BaseError): void;

  protected formatError(error: Error | BaseError): Record<string, any> {
    if (error instanceof BaseError) {
      return {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        stack: error.stack,
      };
    }

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
}
