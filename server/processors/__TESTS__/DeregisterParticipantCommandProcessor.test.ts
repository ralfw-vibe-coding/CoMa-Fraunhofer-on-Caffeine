import assert from "node:assert/strict";
import test from "node:test";
import { MemoryEventStore } from "@ricofritzsche/eventstore";
import { eventTypes } from "../../domain/events.ts";
import { DeregisterParticipantCommandProcessor } from "../DeregisterParticipantCommandProcessor.ts";
import { RegisterParticipantCommandProcessor } from "../RegisterParticipantCommandProcessor.ts";
import { readAllEvents } from "./test-helpers.ts";

test("DeregisterParticipantCommandProcessor appends a scoped deregistration event", async () => {
  const eventStore = new MemoryEventStore();
  const registerProcessor = new RegisterParticipantCommandProcessor(eventStore);
  const deregisterProcessor = new DeregisterParticipantCommandProcessor(eventStore);

  const registration = await registerProcessor.process({ displayName: "Berta" });
  const result = await deregisterProcessor.process({
    participantRegisteredId: registration.eventId!,
  });
  const events = await readAllEvents(eventStore);
  const deregistrationEvent = events.find(
    (event) => event.eventType === eventTypes.participantDeregistered,
  );

  assert.equal(result.status, true);
  assert.equal(events.length, 2);
  assert.deepEqual(deregistrationEvent?.payload.scopes, {
    participantRegisteredId: registration.eventId,
  });
});

test("DeregisterParticipantCommandProcessor rejects unknown participants", async () => {
  const eventStore = new MemoryEventStore();
  const processor = new DeregisterParticipantCommandProcessor(eventStore);

  const result = await processor.process({
    participantRegisteredId: "missing-participant",
  });

  assert.deepEqual(result, {
    status: false,
    message: "Teilnehmer wurde nicht gefunden.",
  });
  assert.equal((await readAllEvents(eventStore)).length, 0);
});
