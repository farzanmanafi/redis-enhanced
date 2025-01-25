export interface TransactionResult<T> {
  success: boolean;
  results: T[];
  error?: Error;
}
