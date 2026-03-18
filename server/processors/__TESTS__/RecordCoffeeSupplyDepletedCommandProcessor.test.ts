import assert from "node:assert/strict";
import test from "node:test";
import { MemoryEventStore } from "@ricofritzsche/eventstore";
import { eventTypes } from "../../domain/events.ts";
import { RecordCoffeeSupplyDepletedCommandProcessor } from "../RecordCoffeeSupplyDepletedCommandProcessor.ts";
import { readAllEvents } from "./test-helpers.ts";

test("RecordCoffeeSupplyDepletedCommandProcessor appends a coffeeSupplyDepleted event", async () => {
  const eventStore = new MemoryEventStore();
  const processor = new RecordCoffeeSupplyDepletedCommandProcessor(eventStore);

  const result = await processor.process({});
  const events = await readAllEvents(eventStore);

  assert.equal(result.status, true);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.eventType, eventTypes.coffeeSupplyDepleted);
});
