import "dotenv/config";
import { ENV } from "../../src/config/env.config";

export const TEST_REDIS_URL = `redis://${ENV.redis.username}:${ENV.redis.password}@${ENV.redis.host}:${ENV.redis.port}/${ENV.redis.db}`;
