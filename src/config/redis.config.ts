export interface RedisConfig {
  url: string;
  username?: string;
  password?: string;
  db?: number;
}

export const defaultRedisConfig: RedisConfig = {
  url: "redis://localhost:6380",
  password: "123456",
};
