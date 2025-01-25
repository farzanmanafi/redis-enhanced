export const ENV = {
  redis: {
    host: process.env.REDIS_HOST || "",
    port: parseInt(process.env.REDIS_PORT || "6380"),
    username: process.env.REDIS_USERNAME || "",
    password: process.env.REDIS_PASSWORD || "",
    db: parseInt(process.env.REDIS_DB || "0"),
  },
};
