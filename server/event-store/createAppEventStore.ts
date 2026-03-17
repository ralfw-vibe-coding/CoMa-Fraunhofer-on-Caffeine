import fs from "node:fs/promises";
import path from "node:path";
import {
  MemoryEventStore,
  PostgresEventStore,
  type EventStore,
} from "@ricofritzsche/eventstore";

type StoreBackend = "memory" | "postgres";

export type AppEventStore = {
  eventStore: EventStore;
  backend: StoreBackend;
  close: () => Promise<void>;
};

export async function createAppEventStore(): Promise<AppEventStore> {
  const backend = (process.env.EVENT_STORE_BACKEND ?? "memory") as StoreBackend;

  if (backend === "postgres") {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL ist erforderlich, wenn EVENT_STORE_BACKEND=postgres gesetzt ist.",
      );
    }

    const eventStore = new PostgresEventStore({ connectionString });
    await eventStore.initializeDatabase();

    return {
      eventStore,
      backend,
      close: async () => {
        await eventStore.close();
      },
    };
  }

  const memoryFilename =
    process.env.EVENT_STORE_MEMORY_FILE ??
    path.resolve(process.cwd(), "data", "coffee-events.json");

  await fs.mkdir(path.dirname(memoryFilename), { recursive: true });

  const eventStore = await MemoryEventStore.createFromFile(
    memoryFilename,
    true,
    true,
  );

  return {
    eventStore,
    backend: "memory",
    close: async () => undefined,
  };
}
