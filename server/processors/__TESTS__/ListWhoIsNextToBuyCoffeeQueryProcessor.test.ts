import assert from "node:assert/strict";
import test from "node:test";
import { MemoryEventStore } from "@ricofritzsche/eventstore";
import { eventTypes } from "../../domain/events.ts";
import { ListWhoIsNextToBuyCoffeeQueryProcessor } from "../ListWhoIsNextToBuyCoffeeQueryProcessor.ts";
import { appendSeedEvents, withStubbedRandom } from "./test-helpers.ts";

test("ListWhoIsNextToBuyCoffeeQueryProcessor returns depleted-state metadata and a top-3 ranking", async () => {
  const eventStore = new MemoryEventStore();
  const processor = new ListWhoIsNextToBuyCoffeeQueryProcessor(eventStore);

  await appendSeedEvents(eventStore, [
    {
      eventType: eventTypes.participantRegistered,
      payload: {
        participantRegisteredId: "participant-anna",
        displayName: "Anna",
      },
    },
    {
      eventType: eventTypes.participantRegistered,
      payload: {
        participantRegisteredId: "participant-bert",
        displayName: "Bert",
      },
    },
    {
      eventType: eventTypes.participantRegistered,
      payload: {
        participantRegisteredId: "participant-cora",
        displayName: "Cora",
      },
    },
    {
      eventType: eventTypes.participantRegistered,
      payload: {
        participantRegisteredId: "participant-dirk",
        displayName: "Dirk",
      },
    },
    {
      eventType: eventTypes.coffeeSupplyDepleted,
      payload: {
        coffeeSupplyDepletedId: "supply-1",
      },
    },
    {
      eventType: eventTypes.coffeeDrawn,
      payload: {
        coffeeDrawnId: "drawn-1",
        scopes: {
          participantRegisteredId: "participant-anna",
        },
      },
    },
    {
      eventType: eventTypes.coffeeDrawn,
      payload: {
        coffeeDrawnId: "drawn-2",
        scopes: {
          participantRegisteredId: "participant-cora",
        },
      },
    },
  ]);

  const result = await withStubbedRandom(0.1, () => processor.process());

  assert.equal(result.urgency, "high");
  assert.equal(result.isSupplyDepleted, true);
  assert.equal(result.cupsDrawnSinceSupplyDepleted, 2);
  assert.equal(result.ranking.length, 3);
  assert.deepEqual(result.consumptionByParticipant, [
    {
      participantRegisteredId: "participant-anna",
      displayName: "Anna",
      cupsConsumed: 1,
    },
    {
      participantRegisteredId: "participant-cora",
      displayName: "Cora",
      cupsConsumed: 1,
    },
    {
      participantRegisteredId: "participant-bert",
      displayName: "Bert",
      cupsConsumed: 0,
    },
    {
      participantRegisteredId: "participant-dirk",
      displayName: "Dirk",
      cupsConsumed: 0,
    },
  ]);
  assert.equal(result.totalCupsConsumed, 2);
  for (const displayName of result.ranking) {
    assert.ok(["Anna", "Bert", "Cora", "Dirk"].includes(displayName));
  }
});
