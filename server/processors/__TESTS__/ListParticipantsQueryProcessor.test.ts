import assert from "node:assert/strict";
import test from "node:test";
import { MemoryEventStore } from "@ricofritzsche/eventstore";
import { eventTypes } from "../../domain/events.ts";
import { ListParticipantsQueryProcessor } from "../ListParticipantsQueryProcessor.ts";
import { appendSeedEvents } from "./test-helpers.ts";

test("ListParticipantsQueryProcessor returns only active participants in sorted order", async () => {
  const eventStore = new MemoryEventStore();
  const processor = new ListParticipantsQueryProcessor(eventStore);

  await appendSeedEvents(eventStore, [
    {
      eventType: eventTypes.participantRegistered,
      payload: {
        participantRegisteredId: "participant-zora",
        displayName: "Zora",
      },
    },
    {
      eventType: eventTypes.participantRegistered,
      payload: {
        participantRegisteredId: "participant-anna",
        displayName: "Anna",
      },
    },
    {
      eventType: eventTypes.participantDeregistered,
      payload: {
        participantDeregisteredId: "dereg-1",
        scopes: {
          participantRegisteredId: "participant-zora",
        },
      },
    },
  ]);

  const result = await processor.process();

  assert.deepEqual(result, {
    participants: [
      {
        participantRegisteredId: "participant-anna",
        displayName: "Anna",
      },
    ],
  });
});
