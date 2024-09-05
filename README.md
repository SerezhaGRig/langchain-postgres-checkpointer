# langchain-postgres-checkpointer

env: DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME

const checkpointer = await PostgresSaver.fromConnString(getPostgresConfig());
