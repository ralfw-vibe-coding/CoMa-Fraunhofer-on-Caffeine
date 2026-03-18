import { type EventRecord } from "@ricofritzsche/eventstore";
import type {
  ListParticipantsQueryResult,
  ListWhoIsNextToBuyCoffeeQueryResult,
} from "./requests.ts";
import { eventTypes } from "./events.ts";

type ParticipantState = {
  displayName: string;
  active: boolean;
  registeredSequenceNumber: number;
  cupsConsumed: number;
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
  let cupsDrawnSinceSupplyDepleted = 0;

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
          cupsConsumed: 0,
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
        cupsDrawnSinceSupplyDepleted = 0;
        break;
      }

      case eventTypes.coffeePurchased: {
        lastCoffeePurchasedSequenceNumber = event.sequenceNumber;
        cupsDrawnSinceSupplyDepleted = 0;
        break;
      }

      case eventTypes.coffeeDrawn: {
        const participantRegisteredId = readScopedParticipantId(event.payload);
        const participant = participantRegisteredId
          ? participants.get(participantRegisteredId)
          : undefined;

        if (participant) {
          participant.cupsConsumed += 1;
        }

        if (lastSupplyDepletedSequenceNumber > lastCoffeePurchasedSequenceNumber) {
          cupsDrawnSinceSupplyDepleted += 1;
        }
        break;
      }
    }
  }

  return {
    participants,
    lastSupplyDepletedSequenceNumber,
    lastCoffeePurchasedSequenceNumber,
    cupsDrawnSinceSupplyDepleted,
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
    cupsDrawnSinceSupplyDepleted,
  } = buildParticipantState(events);

  const activeParticipantNames = Array.from(participants.values())
    .filter((participant) => participant.active)
    .map((participant) => participant.displayName);
  const consumptionByParticipant = Array.from(participants.entries())
    .filter(([, participant]) => participant.active)
    .sort((left, right) => {
      if (left[1].cupsConsumed === right[1].cupsConsumed) {
        if (left[1].displayName === right[1].displayName) {
          return left[1].registeredSequenceNumber - right[1].registeredSequenceNumber;
        }

        return left[1].displayName.localeCompare(right[1].displayName, "de");
      }

      return right[1].cupsConsumed - left[1].cupsConsumed;
    })
    .map(([participantRegisteredId, participant]) => ({
      participantRegisteredId,
      displayName: participant.displayName,
      cupsConsumed: participant.cupsConsumed,
    }));
  const totalCupsConsumed = consumptionByParticipant.reduce(
    (total, participant) => total + participant.cupsConsumed,
    0,
  );

  const ranking = shuffle(activeParticipantNames).slice(0, 3);

  if (lastSupplyDepletedSequenceNumber === 0) {
    return {
      ranking,
      urgency: "low",
      isSupplyDepleted: false,
      cupsDrawnSinceSupplyDepleted: 0,
      consumptionByParticipant,
      totalCupsConsumed,
    };
  }

  if (lastCoffeePurchasedSequenceNumber < lastSupplyDepletedSequenceNumber) {
    return {
      ranking,
      urgency: "high",
      isSupplyDepleted: true,
      cupsDrawnSinceSupplyDepleted,
      consumptionByParticipant,
      totalCupsConsumed,
    };
  }

  return {
    ranking,
    urgency: "low",
    isSupplyDepleted: false,
    cupsDrawnSinceSupplyDepleted: 0,
    consumptionByParticipant,
    totalCupsConsumed,
  };
}
