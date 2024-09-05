# langchain-postgres-checkpointer

copy checkpointer folder into your project and install required deps from package json

setup env for postgres connection
env: DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME

get checkpointer
const checkpointer = await PostgresSaver.fromConnString(getPostgresConfig());
