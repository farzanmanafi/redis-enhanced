export * from "./core/client";
export * from "./core/persistence";
export * from "./core/transaction";
export * from "./interfaces/persistence.interface";
export * from "./interfaces/transaction.interface";
export * from "./model/base.model";
import "dotenv/config";
import { validateEnv } from "./utils/env.validator";
validateEnv();
