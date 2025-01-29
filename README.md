# Redis Enhanced

A powerful, TypeScript-first Redis client with advanced persistence and transaction management built on top of redis-om.

## 🌟 Features

- **Enhanced Redis Client**: Simplified Redis interactions with robust error handling
- **Persistence Management**:
  - RDB (Redis Database) Persistence
  - AOF (Append Only File) Persistence
  - Configurable save strategies
- **Transaction Support**:
  - Atomic operations
  - Entity versioning
  - Comprehensive transaction lifecycle management
- **TypeScript First**:
  - Strong typing
  - Comprehensive type definitions
  - Easy integration with TypeScript projects

## 📦 Installation

Install the package using npm:

```bash
npm install redis-enhanced
```

## 🚀 Quick Start

### Basic Connection

```typescript
import { EnhancedRedisClient } from 'redis-enhanced';

// Create a client with connection details
const client = new EnhancedRedisClient({
  url: 'redis://localhost:6379',
  password: 'your_password'
});

// Connect to Redis
await client.connect();
```

## 🔧 Configuration

### Redis Configuration

```typescript
interface RedisConfig {
  url: string;       // Redis connection URL
  username?: string; // Optional username
  password?: string; // Optional password
  db?: number;       // Optional database number
}
```

### Persistence Configuration

```typescript
enum PersistenceType {
  NONE = 'NONE',  // No persistence
  RDB = 'RDB',    // Redis Database persistence
  AOF = 'AOF'     // Append Only File persistence
}

interface PersistenceConfig {
  type: PersistenceType;
  rdbOptions?: {
    saveFrequency: number; // Save interval in seconds
  };
  aofOptions?: {
    appendfsync: 'always' | 'everysec' | 'no';
  };
}
```

## 📝 Usage Examples

### Persistence Management

```typescript
// Configure RDB Persistence
const persistenceManager = client.getPersistenceManager();
await persistenceManager.setPersistence({
  type: PersistenceType.RDB,
  rdbOptions: {
    saveFrequency: 3600 // Save every hour
  }
});

// Check current persistence configuration
const currentConfig = await persistenceManager.getCurrentConfig();

// Check persistence status
const status = await persistenceManager.checkPersistenceStatus();
```

### Transaction Management

```typescript
// Define an entity interface
interface User extends EntityData {
  name: string;
  email: string;
}

// Get transaction manager
const transactionManager = client.getTransactionManager();

// Save an entity
const savedUser = await transactionManager.save({
  name: 'John Doe',
  email: 'john@example.com'
});

// Fetch an entity
const user = await transactionManager.fetch(savedUser.entityId!);

// Remove an entity
await transactionManager.remove(savedUser.entityId!);
```

### Advanced Transactions

```typescript
// Begin a transaction
await transactionManager.beginTransaction();

try {
  // Perform multiple operations
  const user1 = await transactionManager.save({ name: 'Alice' });
  const user2 = await transactionManager.save({ name: 'Bob' });

  // Commit the transaction
  await transactionManager.commitTransaction();
} catch (error) {
  // Rollback if any operation fails
  await transactionManager.rollbackTransaction();
}
```

## 🛠 Server Information and Utilities

```typescript
// Ping Redis server
const isAlive = await client.ping();

// Get server information
const serverInfo = await client.getServerInfo();

// Flush the entire database
await client.flushDb();
```

## 🔒 Error Handling

The library provides comprehensive error handling with typed errors:

- Connection errors
- Persistence configuration errors
- Transaction errors
- Validation errors

## 🏗 Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/redis-enhanced.git

# Install dependencies
npm install

# Run tests
npm test
```

### Testing

- Unit Tests: `npm run test:unit`
- Integration Tests: `npm run test:integration`
- All Tests: `npm run test:all`

## 🐳 Docker Support

```bash
# Start Redis using Docker Compose
docker-compose up -d redis

# Run tests in Docker
docker-compose run test
```

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💡 Feedback

Found a bug? Have a suggestion? Please open an issue on GitHub.

```

Feel free to customize the README further based on specific details about your package or additional features you'd like to highlight.
```
