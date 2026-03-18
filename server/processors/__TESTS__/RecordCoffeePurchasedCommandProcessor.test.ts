import assert from "node:assert/strict";
import test from "node:test";
import { MemoryEventStore } from "@ricofritzsche/eventstore";
import { eventTypes } from "../../domain/events.ts";
import { RecordCoffeePurchasedCommandProcessor } from "../RecordCoffeePurchasedCommandProcessor.ts";
import { RegisterParticipantCommandProcessor } from "../RegisterParticipantCommandProcessor.ts";
import { readAllEvents } from "./test-helpers.ts";

test("RecordCoffeePurchasedCommandProcessor validates the amount and appends purchases for active participants", async () => {
  const eventStore = new MemoryEventStore();
  const registerProcessor = new RegisterParticipantCommandProcessor(eventStore);
  const purchaseProcessor = new RecordCoffeePurchasedCommandProcessor(eventStore);

  const registration = await registerProcessor.process({ displayName: "Dora" });
  const invalidResult = await purchaseProcessor.process({
    participantRegisteredId: registration.eventId!,
    amountEuro: 0,
  });
  const validResult = await purchaseProcessor.process({
    participantRegisteredId: registration.eventId!,
    amountEuro: 14.2,
  });
  const purchaseEvent = (await readAllEvents(eventStore)).find(
    (event) => event.eventType === eventTypes.coffeePurchased,
  );

  assert.deepEqual(invalidResult, {
    status: false,
    message: "amountEuro muss größer als 0 sein.",
  });
  assert.equal(validResult.status, true);
  assert.equal(purchaseEvent?.payload.amountEuro, 14.2);
  assert.deepEqual(purchaseEvent?.payload.scopes, {
    participantRegisteredId: registration.eventId,
  });
});
