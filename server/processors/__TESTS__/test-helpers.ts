import { type Event, MemoryEventStore } from "@ricofritzsche/eventstore";

export function withStubbedRandom<T>(
  value: number,
  run: () => Promise<T>,
): Promise<T> {
  const originalRandom = Math.random;
  Math.random = () => value;

  return run().finally(() => {
    Math.random = originalRandom;
  });
}

export async function readAllEvents(store: MemoryEventStore) {
  return (await store.query()).events;
}

export async function appendSeedEvents(store: MemoryEventStore, events: Event[]) {
  await store.append(events);
}
