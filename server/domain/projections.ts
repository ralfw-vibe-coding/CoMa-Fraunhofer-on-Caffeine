import { type EventRecord } from "@ricofritzsche/eventstore";
import type {
  ListParticipantsQueryResult,
  ListWhoIsNextToBuyCoffeeQueryResult,
} from "./requests";
import { eventTypes } from "./events";

type ParticipantState = {
  displayName: string;
  active: boolean;
  registeredSequenceNumber: number;
};

function readString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readScopedParticipantId(payload: Record<string, unknown>): string | null {
  const scopes = payload.scopes;
  if (!scopes || typeof scopes !== "object") {
    return null;
  }

  const value = (scopes as Record<string, unknown>).participantRegisteredId;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function buildParticipantState(events: EventRecord[]) {
  const participants = new Map<string, ParticipantState>();
  let lastSupplyDepletedSequenceNumber = 0;
  let lastCoffeePurchasedSequenceNumber = 0;

  for (const event of events) {
    switch (event.eventType) {
      case eventTypes.participantRegistered: {
        const participantRegisteredId = readString(
          event.payload,
          "participantRegisteredId",
        );
        const displayName = readString(event.payload, "displayName");

        if (!participantRegisteredId || !displayName) {
          break;
        }

        participants.set(participantRegisteredId, {
          displayName,
          active: true,
          registeredSequenceNumber: event.sequenceNumber,
        });
        break;
      }

      case eventTypes.participantDeregistered: {
        const participantRegisteredId = readScopedParticipantId(event.payload);
        const participant = participantRegisteredId
          ? participants.get(participantRegisteredId)
          : undefined;

        if (participant) {
          participant.active = false;
        }
        break;
      }

      case eventTypes.coffeeSupplyDepleted: {
        lastSupplyDepletedSequenceNumber = event.sequenceNumber;
        break;
      }

      case eventTypes.coffeePurchased: {
        lastCoffeePurchasedSequenceNumber = event.sequenceNumber;
        break;
      }
    }
  }

  return {
    participants,
    lastSupplyDepletedSequenceNumber,
    lastCoffeePurchasedSequenceNumber,
  };
}

export function projectParticipants(
  events: EventRecord[],
): ListParticipantsQueryResult {
  const { participants } = buildParticipantState(events);

  return {
    participants: Array.from(participants.entries())
      .filter(([, participant]) => participant.active)
      .sort((left, right) => {
        if (left[1].displayName === right[1].displayName) {
          return left[1].registeredSequenceNumber - right[1].registeredSequenceNumber;
        }

        return left[1].displayName.localeCompare(right[1].displayName, "de");
      })
      .map(([participantRegisteredId, participant]) => ({
        participantRegisteredId,
        displayName: participant.displayName,
      })),
  };
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[randomIndex] as T;
    copy[randomIndex] = current as T;
  }

  return copy;
}

export function projectRanking(
  events: EventRecord[],
): ListWhoIsNextToBuyCoffeeQueryResult {
  const {
    participants,
    lastSupplyDepletedSequenceNumber,
    lastCoffeePurchasedSequenceNumber,
  } = buildParticipantState(events);

  const activeParticipantNames = Array.from(participants.values())
    .filter((participant) => participant.active)
    .map((participant) => participant.displayName);

  const ranking = shuffle(activeParticipantNames).slice(0, 3);

  if (lastSupplyDepletedSequenceNumber === 0) {
    return {
      ranking,
      urgency: "low",
    };
  }

  if (lastCoffeePurchasedSequenceNumber < lastSupplyDepletedSequenceNumber) {
    return {
      ranking,
      urgency: "high",
    };
  }

  return {
    ranking,
    urgency: "low",
  };
}
