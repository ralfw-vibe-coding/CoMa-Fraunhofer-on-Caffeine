import assert from "node:assert/strict";
import test from "node:test";
import { MemoryEventStore } from "@ricofritzsche/eventstore";
import { eventTypes } from "../../domain/events.ts";
import { RegisterParticipantCommandProcessor } from "../RegisterParticipantCommandProcessor.ts";
import { readAllEvents } from "./test-helpers.ts";

test("RegisterParticipantCommandProcessor appends a trimmed participantRegistered event", async () => {
  const eventStore = new MemoryEventStore();
  const processor = new RegisterParticipantCommandProcessor(eventStore);

  const result = await processor.process({ displayName: "  Ada  " });
  const events = await readAllEvents(eventStore);

  assert.equal(result.status, true);
  assert.match(result.eventId ?? "", /^[0-9a-f-]{36}$/i);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.eventType, eventTypes.participantRegistered);
  assert.equal(events[0]?.payload.displayName, "Ada");
});
