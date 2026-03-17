import { createFilter, createQuery } from "@ricofritzsche/eventstore";

export const eventTypes = {
  participantRegistered: "participantRegistered",
  participantDeregistered: "participantDeregistered",
  coffeeDrawn: "coffeeDrawn",
  coffeeSupplyDepleted: "coffeeSupplyDepleted",
  coffeePurchased: "coffeePurchased",
} as const;

export function createParticipantContextQuery(participantRegisteredId: string) {
  return createQuery(
    createFilter([eventTypes.participantRegistered], [{ participantRegisteredId }]),
    createFilter(
      [
        eventTypes.participantDeregistered,
        eventTypes.coffeeDrawn,
        eventTypes.coffeePurchased,
      ],
      [{ scopes: { participantRegisteredId } }],
    ),
  );
}

export function createParticipantListQuery() {
  return createQuery(
    createFilter([eventTypes.participantRegistered, eventTypes.participantDeregistered]),
  );
}

export function createRankingQuery() {
  return createQuery(
    createFilter([
      eventTypes.participantRegistered,
      eventTypes.participantDeregistered,
      eventTypes.coffeeDrawn,
      eventTypes.coffeeSupplyDepleted,
      eventTypes.coffeePurchased,
    ]),
  );
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
