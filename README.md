# Redis Enhanced Client

An enhanced Redis client with persistence and transaction support, built on top of redis-om.

## Features

- Persistence management (RDB/AOF)
- Transaction support
- Enhanced entity management
- TypeScript support
- Comprehensive test coverage

## Installation

```bash
npm install redis-enhanced
```

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure your environment variables in `.env`:

```
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_USERNAME=default
REDIS_PASSWORD=your_password
REDIS_DB=0
```

## Quick Start

```typescript
import { EnhancedRedisClient } from 'redis-enhanced';

const client = new EnhancedRedisClient({
  url: "redis://localhost:6380",
  password: "your_password"
});

await client.connect();
```

## Configuration

### Redis Configuration

```typescript
interface RedisConfig {
  url: string;
  username?: string;
  password?: string;
  db?: number;
}
```

### Persistence Configuration

```typescript
enum PersistenceType {
  NONE = "NONE",
  RDB = "RDB",
  AOF = "AOF"
}

interface PersistenceConfig {
  type: PersistenceType;
  rdbOptions?: {
    saveFrequency: number;
  };
  aofOptions?: {
    appendfsync: "always" | "everysec" | "no";
  };
}
```

## Usage Examples

### Basic Operations

```typescript
const transactionManager = client.getTransactionManager();

// Save entity
const entity = await transactionManager.save({
  name: "example",
  value: 42
});

// Fetch entity
const fetched = await transactionManager.fetch(entity.entityId);

// Remove entity
await transactionManager.remove(entity.entityId);
```

### Persistence Management

```typescript
const persistenceManager = client.getPersistenceManager();

await persistenceManager.setPersistence({
  type: PersistenceType.AOF,
  aofOptions: {
    appendfsync: "everysec"
  }
});
```

## Development

### Setup

```bash
npm install
```

### Testing

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration
```

### Building

```bash
npm run build
```

## Docker Support

Run Redis instance:

```bash
docker compose up -d redis
```

Run tests in Docker:

```bash
docker build -f Dockerfile.test -t redis-enhanced-test .
docker run redis-enhanced-test
```

## License

MIT
