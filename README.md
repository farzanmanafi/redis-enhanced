# Redis Enhanced

Enhanced Redis client with persistence and transaction support, built on top of redis-om.

## Features

- Persistent Storage Configuration
- Transaction Support
- Built on redis-om
- TypeScript support

## Installation

\`\`\`bash
npm install redis-enhanced
\`\`\`

## Usage

### Basic Usage

\`\`\`typescript
import { EnhancedRedisClient } from 'redis-enhanced';

const client = new EnhancedRedisClient();
await client.connect();
\`\`\`

### Persistence Configuration

\`\`\`typescript
import { EnhancedRedisClient, PersistenceType } from 'redis-enhanced';

const client = new EnhancedRedisClient();
const persistenceManager = client.getPersistenceManager();

await persistenceManager.setPersistence({
type: PersistenceType.RDB,
rdbOptions: {
saveFrequency: 3600
}
});
\`
# redis-enhanced
