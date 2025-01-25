import { ENV } from "./env.config";

export interface RedisConfig {
  url: string;
  username?: string;
  password?: string;
  db?: number;
}

// export const defaultRedisConfig: RedisConfig = {
//   url: `redis://${ENV.redis.host}:${ENV.redis.port}`,
//   username: ENV.redis.username,
//   password: ENV.redis.password,
//   db: ENV.redis.db,
// };
export const defaultRedisConfig: RedisConfig = {
  url: `redis://${ENV.redis.username}:${ENV.redis.password}@${ENV.redis.host}:${ENV.redis.port}`,
};
