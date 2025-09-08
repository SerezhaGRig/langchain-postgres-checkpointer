# LangGraph PostgreSQL Checkpointer

A PostgreSQL-based checkpointer for LangGraph that enables persistent storage and retrieval of graph execution checkpoints. This package allows you to maintain state across sessions in your LangGraph applications.

## Features

- 🔄 **Persistent Checkpoints**: Save and restore LangGraph execution states to PostgreSQL
- 🔍 **Thread Management**: Organize checkpoints by thread IDs for multi-conversation support
- 📚 **History Traversal**: Navigate through checkpoint history with parent-child relationships
- ⚡ **Automatic Setup**: Database tables are created automatically on first use
- 🔧 **Flexible Configuration**: Support for environment variables and connection strings

## Installation

```bash
npm i langgraph-postgres-checkpointer
```

or with yarn:

```bash
yarn add langgraph-postgres-checkpointer
```

## Prerequisites

- Node.js >= 16.0.0
- PostgreSQL database
- `@langchain/langgraph` >= 0.0.33

## Quick Start

### 1. Set up environment variables

Create a `.env` file or set these environment variables:

```bash
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
```

### 2. Initialize the checkpointer

```typescript
import { PostgresSaver, getPostgresConfig } from '@your-scope/langgraph-postgres-checkpointer';

// Using environment variables
const checkpointer = await PostgresSaver.fromConnString(getPostgresConfig());

// Or using a custom configuration
const checkpointer = await PostgresSaver.fromConnString({
  user: 'username',
  password: 'password',
  host: 'localhost',
  port: 5432,
  database: 'mydb'
});

// Or using a connection string
const checkpointer = await PostgresSaver.fromConnString({
  connectionString: 'postgresql://username:password@localhost:5432/mydb'
});
```

### 3. Use with LangGraph

```typescript
import { StateGraph } from '@langchain/langgraph';

// Define your graph state
const graph = new StateGraph({
  // your graph configuration
});

// Compile with checkpointer
const app = graph.compile({
  checkpointer: checkpointer
});

// Run with thread ID for persistence
const config = {
  configurable: {
    thread_id: "conversation-123"
  }
};

const result = await app.invoke(input, config);
```

## API Reference

### PostgresSaver

The main class for checkpoint persistence.

#### Methods

##### `static fromConnString(config: ClientConfig): Promise<PostgresSaver>`
Creates a new PostgresSaver instance with the provided database configuration.

##### `getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined>`
Retrieves a specific checkpoint or the latest checkpoint for a thread.

##### `list(config: RunnableConfig, limit?: number, before?: RunnableConfig): AsyncGenerator<CheckpointTuple>`
Lists checkpoints for a specific thread with optional pagination.

##### `put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig>`
Saves a new checkpoint or updates an existing one.

### Configuration Helpers

##### `getPostgresConfig(env?: NodeJS.ProcessEnv): PostgresConfig`
Generates PostgreSQL configuration from environment variables.

Supported environment variables:
- `DB_USERNAME` or `PGUSER` - Database username
- `DB_PASSWORD` or `PGPASSWORD` - Database password  
- `DB_HOST` or `PGHOST` - Database host (default: 'localhost')
- `DB_PORT` or `PGPORT` - Database port (default: 5432)
- `DB_NAME` or `PGDATABASE` - Database name

## Database Schema

The checkpointer automatically creates the following table:

```sql
CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    parent_id TEXT,
    checkpoint TEXT,
    metadata TEXT,
    PRIMARY KEY (thread_id, checkpoint_id)
);
```

## Advanced Usage

### Custom Serialization

You can provide a custom serializer when creating the checkpointer:

```typescript
import { SerializerProtocol } from '@langchain/langgraph/dist/serde/base';

const customSerializer: SerializerProtocol<unknown> = {
  stringify: (obj) => JSON.stringify(obj),
  parse: (str) => JSON.parse(str)
};

const client = new Client(config);
await client.connect();
const checkpointer = new PostgresSaver(client, customSerializer);
```

### Managing Multiple Conversations

```typescript
// Each conversation gets its own thread ID
const thread1Config = { configurable: { thread_id: "user-123-chat-1" } };
const thread2Config = { configurable: { thread_id: "user-123-chat-2" } };

// Run separate conversations
await app.invoke(input1, thread1Config);
await app.invoke(input2, thread2Config);

// List checkpoints for a specific thread
const checkpoints = checkpointer.list(thread1Config, 10);
for await (const checkpoint of checkpoints) {
  console.log(checkpoint.checkpoint_id);
}
```

## Error Handling

The checkpointer includes built-in error handling with console logging. In production, you may want to implement custom error handling:

```typescript
try {
  const checkpointer = await PostgresSaver.fromConnString(config);
} catch (error) {
  console.error('Failed to initialize checkpointer:', error);
  // Handle error appropriately
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions, please [open an issue](https://github.com/yourusername/langgraph-postgres-checkpointer/issues) on Gi