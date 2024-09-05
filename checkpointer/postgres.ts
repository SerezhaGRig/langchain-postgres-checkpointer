import { Client, ClientConfig } from "pg";
import {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointMetadata,
} from "@langchain/langgraph";
import { SerializerProtocol } from "@langchain/langgraph/dist/serde/base";
import { RunnableConfig } from "@langchain/core/runnables";
import { CheckpointTuple } from "@langchain/langgraph/dist/checkpoint/base";

interface CheckpointRow {
  thread_id: string;
  checkpoint_id: string;
  parent_id?: string;
  checkpoint: string;
  metadata: string;
}

export class PostgresSaver extends BaseCheckpointSaver {
  private client: Client;
  private isSetup: boolean;

  constructor(client: Client, serde?: SerializerProtocol<unknown>) {
    super(serde);
    this.client = client;
    this.isSetup = false;
  }

  static async fromConnString(config: ClientConfig): Promise<PostgresSaver> {
    const client = new Client(config);
    await client.connect();
    console.log("connected");
    return new PostgresSaver(client);
  }

  private async setup(): Promise<void> {
    if (this.isSetup) return;

    try {
      await this.client.query(`
                CREATE TABLE IF NOT EXISTS checkpoints (
                    thread_id TEXT NOT NULL,
                    checkpoint_id TEXT NOT NULL,
                    parent_id TEXT,
                    checkpoint TEXT,
                    metadata TEXT,
                    PRIMARY KEY (thread_id, checkpoint_id)
                );
            `);
    } catch (error) {
      console.error("Error creating checkpoints table", error);
      throw error;
    }
    console.log("setup");
    this.isSetup = true;
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    await this.setup();
    const thread_id = config.configurable?.thread_id;
    const checkpoint_id = config.configurable?.checkpoint_id;

    if (checkpoint_id) {
      try {
        const res = await this.client.query(
          `SELECT checkpoint, parent_id, metadata FROM checkpoints WHERE thread_id = $1 AND checkpoint_id = $2`,
          [thread_id, checkpoint_id],
        );

        if (res.rows.length) {
          const row = res.rows[0] as CheckpointRow;
          return {
            config,
            checkpoint: (await this.serde.parse(row.checkpoint)) as Checkpoint,
            metadata: (await this.serde.parse(
              row.metadata,
            )) as CheckpointMetadata,
            parentConfig: row.parent_id
              ? {
                  configurable: {
                    thread_id,
                    checkpoint_id: row.parent_id,
                  },
                }
              : undefined,
          };
        }
      } catch (error) {
        console.error("Error retrieving checkpoint", error);
        throw error;
      }
    } else {
      const res = await this.client.query(
        `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata FROM checkpoints WHERE thread_id = $1 ORDER BY checkpoint_id DESC LIMIT 1`,
        [thread_id],
      );

      if (res.rows.length) {
        const row = res.rows[0] as CheckpointRow;
        return {
          config: {
            configurable: {
              thread_id: row.thread_id,
              checkpoint_id: row.checkpoint_id,
            },
          },
          checkpoint: (await this.serde.parse(row.checkpoint)) as Checkpoint,
          metadata: (await this.serde.parse(
            row.metadata,
          )) as CheckpointMetadata,
          parentConfig: row.parent_id
            ? {
                configurable: {
                  thread_id: row.thread_id,
                  checkpoint_id: row.parent_id,
                },
              }
            : undefined,
        };
      }
    }
    return undefined;
  }

  async *list(
    config: RunnableConfig,
    limit?: number,
    before?: RunnableConfig,
  ): AsyncGenerator<CheckpointTuple> {
    await this.setup();
    const thread_id = config.configurable?.thread_id;
    let sql = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata FROM checkpoints WHERE thread_id = $1 ${before ? "AND checkpoint_id < $2" : ""} ORDER BY checkpoint_id DESC`;
    const params: (string | number)[] = [thread_id];

    if (before) {
      params.push(before.configurable?.checkpoint_id);
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    try {
      const res = await this.client.query(sql, params);

      for (const row of res.rows) {
        yield {
          config: {
            configurable: {
              thread_id: row.thread_id,
              checkpoint_id: row.checkpoint_id,
            },
          },
          checkpoint: (await this.serde.parse(row.checkpoint)) as Checkpoint,
          metadata: (await this.serde.parse(
            row.metadata,
          )) as CheckpointMetadata,
          parentConfig: row.parent_id
            ? {
                configurable: {
                  thread_id: row.thread_id,
                  checkpoint_id: row.parent_id,
                },
              }
            : undefined,
        };
      }
    } catch (error) {
      console.error("Error listing checkpoints", error);
      throw error;
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
  ): Promise<RunnableConfig> {
    await this.setup();
    try {
      const query = `
                INSERT INTO checkpoints (thread_id, checkpoint_id, parent_id, checkpoint, metadata)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (thread_id, checkpoint_id) DO UPDATE
                SET checkpoint = EXCLUDED.checkpoint, metadata = EXCLUDED.metadata
            `;

      const params = [
        config.configurable?.thread_id,
        checkpoint.id,
        config.configurable?.checkpoint_id,
        this.serde.stringify(checkpoint),
        this.serde.stringify(metadata),
      ];

      await this.client.query(query, params);
    } catch (error) {
      console.error("Error saving checkpoint", error);
      throw error;
    }

    return {
      configurable: {
        thread_id: config.configurable?.thread_id,
        checkpoint_id: checkpoint.id,
      },
    };
  }
}
