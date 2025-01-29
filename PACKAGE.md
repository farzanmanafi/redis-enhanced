# Redis Enhanced

## Overview

Redis Enhanced is a robust, TypeScript-first Redis client library that provides advanced persistence and transaction management capabilities. Built on top of redis-om, this package offers a comprehensive solution for managing Redis interactions with enhanced type safety, error handling, and configuration options.

## Key Features

- 🚀 **Enhanced Redis Client**: Simplified Redis interactions with comprehensive error handling
- 💾 **Advanced Persistence Management**:
  - Support for RDB (Redis Database) and AOF (Append Only File) persistence
  - Configurable save strategies and synchronization options
- 🔄 **Powerful Transaction Support**:
  - Atomic operations
  - Entity versioning
  - Comprehensive transaction lifecycle management
- 🛡️ **TypeScript First**:
  - Strong typing
  - Extensive type definitions
  - Seamless integration with TypeScript projects

## Use Cases

- Microservices with complex data persistence requirements
- Caching layers with advanced configuration needs
- Applications requiring robust transaction management
- Projects needing type-safe Redis interactions

## Why Choose Redis Enhanced?

- **Simplified Configuration**: Intuitive setup for Redis connections and persistence
- **Comprehensive Error Handling**: Detailed, typed errors for better debugging
- **Flexible Persistence**: Easy switching between persistence types
- **Transaction Safety**: Atomic operations with rollback support

## Quick Example

```typescript
import { EnhancedRedisClient, PersistenceType } from 'redis-enhanced';

const client = new EnhancedRedisClient({
  url: 'redis://localhost:6379',
  password: 'your_password'
});

await client.connect();

// Configure RDB Persistence
const persistenceManager = client.getPersistenceManager();
await persistenceManager.setPersistence({
  type: PersistenceType.RDB,
  rdbOptions: { saveFrequency: 3600 }
});

// Perform transactions
const transactionManager = client.getTransactionManager();
const user = await transactionManager.save({
  name: 'John Doe',
  email: 'john@example.com'
});
```

## Installation

```bash
npm install redis-enhanced
```

## License

MIT License

## Contributing

Contributions, issues, and feature requests are welcome!
