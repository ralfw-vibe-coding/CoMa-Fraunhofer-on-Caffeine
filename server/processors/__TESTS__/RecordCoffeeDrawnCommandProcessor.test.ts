import assert from "node:assert/strict";
import test from "node:test";
import { MemoryEventStore } from "@ricofritzsche/eventstore";
import { eventTypes } from "../../domain/events.ts";
import { DeregisterParticipantCommandProcessor } from "../DeregisterParticipantCommandProcessor.ts";
import { RecordCoffeeDrawnCommandProcessor } from "../RecordCoffeeDrawnCommandProcessor.ts";
import { RegisterParticipantCommandProcessor } from "../RegisterParticipantCommandProcessor.ts";
import { readAllEvents } from "./test-helpers.ts";

test("RecordCoffeeDrawnCommandProcessor rejects deregistered participants", async () => {
  const eventStore = new MemoryEventStore();
  const registerProcessor = new RegisterParticipantCommandProcessor(eventStore);
  const deregisterProcessor = new DeregisterParticipantCommandProcessor(eventStore);
  const drawnProcessor = new RecordCoffeeDrawnCommandProcessor(eventStore);

  const registration = await registerProcessor.process({ displayName: "Clara" });
  await deregisterProcessor.process({ participantRegisteredId: registration.eventId! });

  const result = await drawnProcessor.process({
    participantRegisteredId: registration.eventId!,
  });
  const events = await readAllEvents(eventStore);

  assert.deepEqual(result, {
    status: false,
    message: "Abgemeldete Teilnehmer können keinen Kaffee ziehen.",
  });
  assert.equal(
    events.filter((event) => event.eventType === eventTypes.coffeeDrawn).length,
    0,
  );
});
