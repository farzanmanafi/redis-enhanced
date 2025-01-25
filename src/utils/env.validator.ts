export function validateEnv() {
  const required = ["REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Validate port is numeric
  if (isNaN(parseInt(process.env.REDIS_PORT!))) {
    throw new Error("REDIS_PORT must be a number");
  }
}
