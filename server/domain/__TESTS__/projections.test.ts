import assert from "node:assert/strict";
import test from "node:test";
import type { EventRecord } from "@ricofritzsche/eventstore";
import { eventTypes } from "../events.ts";
import { projectParticipants, projectRanking } from "../projections.ts";

function createEventRecord(
  sequenceNumber: number,
  eventType: string,
  payload: Record<string, unknown>,
): EventRecord {
  return {
    sequenceNumber,
    timestamp: new Date(sequenceNumber * 1_000),
    eventType,
    payload,
  };
}

function withStubbedRandom<T>(value: number, run: () => T): T {
  const originalRandom = Math.random;
  Math.random = () => value;

  try {
    return run();
  } finally {
    Math.random = originalRandom;
  }
}

test("projectParticipants returns active participants sorted by name and registration order", () => {
  const events = [
    createEventRecord(1, eventTypes.participantRegistered, {
      participantRegisteredId: "participant-anna-1",
      displayName: "Anna",
    }),
    createEventRecord(2, eventTypes.participantRegistered, {
      participantRegisteredId: "participant-hans",
      displayName: "Hans",
    }),
    createEventRecord(3, eventTypes.participantRegistered, {
      participantRegisteredId: "participant-anna-2",
      displayName: "Anna",
    }),
    createEventRecord(4, eventTypes.participantDeregistered, {
      participantDeregisteredId: "dereg-1",
      scopes: {
        participantRegisteredId: "participant-hans",
      },
    }),
  ];

  const result = projectParticipants(events);

  assert.deepEqual(result, {
    participants: [
      {
        participantRegisteredId: "participant-anna-1",
        displayName: "Anna",
      },
      {
        participantRegisteredId: "participant-anna-2",
        displayName: "Anna",
      },
    ],
  });
});

test("projectRanking reports no depleted supply before the first empty-supply event", () => {
  const events = [
    createEventRecord(1, eventTypes.participantRegistered, {
      participantRegisteredId: "participant-anna",
      displayName: "Anna",
    }),
    createEventRecord(2, eventTypes.participantRegistered, {
      participantRegisteredId: "participant-bert",
      displayName: "Bert",
    }),
  ];

  const result = withStubbedRandom(0, () => projectRanking(events));

  assert.equal(result.urgency, "low");
  assert.equal(result.isSupplyDepleted, false);
  assert.equal(result.cupsDrawnSinceSupplyDepleted, 0);
  assert.equal(result.ranking.length, 2);
  assert.deepEqual(new Set(result.ranking), new Set(["Anna", "Bert"]));
  assert.deepEqual(result.consumptionByParticipant, [
    {
      participantRegisteredId: "participant-anna",
      displayName: "Anna",
      cupsConsumed: 0,
    },
    {
      participantRegisteredId: "participant-bert",
      displayName: "Bert",
      cupsConsumed: 0,
    },
  ]);
  assert.equal(result.totalCupsConsumed, 0);
});

test("projectRanking counts coffees drawn after a supply-depleted event until a purchase happens", () => {
  const events = [
    createEventRecord(1, eventTypes.participantRegistered, {
      participantRegisteredId: "participant-anna",
      displayName: "Anna",
    }),
    createEventRecord(2, eventTypes.participantRegistered, {
      participantRegisteredId: "participant-bert",
      displayName: "Bert",
    }),
    createEventRecord(3, eventTypes.participantRegistered, {
      participantRegisteredId: "participant-cora",
      displayName: "Cora",
    }),
    createEventRecord(4, eventTypes.coffeeSupplyDepleted, {
      coffeeSupplyDepletedId: "supply-1",
    }),
    createEventRecord(5, eventTypes.coffeeDrawn, {
      coffeeDrawnId: "drawn-1",
      scopes: {
        participantRegisteredId: "participant-anna",
      },
    }),
    createEventRecord(6, eventTypes.coffeeDrawn, {
      coffeeDrawnId: "drawn-2",
      scopes: {
        participantRegisteredId: "participant-bert",
      },
    }),
  ];

  const result = withStubbedRandom(0.2, () => projectRanking(events));

  assert.equal(result.urgency, "high");
  assert.equal(result.isSupplyDepleted, true);
  assert.equal(result.cupsDrawnSinceSupplyDepleted, 2);
  assert.equal(result.ranking.length, 3);
  assert.deepEqual(new Set(result.ranking), new Set(["Anna", "Bert", "Cora"]));
  assert.deepEqual(result.consumptionByParticipant, [
    {
      participantRegisteredId: "participant-anna",
      displayName: "Anna",
      cupsConsumed: 1,
    },
    {
      participantRegisteredId: "participant-bert",
      displayName: "Bert",
      cupsConsumed: 1,
    },
    {
      participantRegisteredId: "participant-cora",
      displayName: "Cora",
      cupsConsumed: 0,
    },
  ]);
  assert.equal(result.totalCupsConsumed, 2);
});

test("projectRanking resets the cup counter after coffee was purchased", () => {
  const events = [
    createEventRecord(1, eventTypes.participantRegistered, {
      participantRegisteredId: "participant-anna",
      displayName: "Anna",
    }),
    createEventRecord(2, eventTypes.coffeeSupplyDepleted, {
      coffeeSupplyDepletedId: "supply-1",
    }),
    createEventRecord(3, eventTypes.coffeeDrawn, {
      coffeeDrawnId: "drawn-1",
      scopes: {
        participantRegisteredId: "participant-anna",
      },
    }),
    createEventRecord(4, eventTypes.coffeePurchased, {
      coffeePurchasedId: "purchase-1",
      amountEuro: 13.5,
      scopes: {
        participantRegisteredId: "participant-anna",
      },
    }),
  ];

  const result = withStubbedRandom(0, () => projectRanking(events));

  assert.equal(result.urgency, "low");
  assert.equal(result.isSupplyDepleted, false);
  assert.equal(result.cupsDrawnSinceSupplyDepleted, 0);
  assert.deepEqual(result.consumptionByParticipant, [
    {
      participantRegisteredId: "participant-anna",
      displayName: "Anna",
      cupsConsumed: 1,
    },
  ]);
  assert.equal(result.totalCupsConsumed, 1);
});
