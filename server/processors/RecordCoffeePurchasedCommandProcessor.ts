import { type Event, type EventRecord, type EventStore } from "@ricofritzsche/eventstore";
import { randomUUID } from "node:crypto";
import {
  createParticipantContextQuery,
  eventTypes,
  isNonEmptyString,
} from "../domain/events.ts";
import type {
  CommandResponse,
  RecordCoffeePurchasedCommand,
} from "../domain/requests.ts";

type ParticipantContextModel = {
  exists: boolean;
  active: boolean;
};

export class RecordCoffeePurchasedCommandProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(
    request: RecordCoffeePurchasedCommand,
  ): Promise<CommandResponse> {
    const plausibilityError = this.checkPlausibility(request);
    if (plausibilityError) {
      return plausibilityError;
    }

    const contextQuery = createParticipantContextQuery(request.participantRegisteredId);
    const context = await this.eventStore.query(contextQuery);
    const contextModel = this.buildContextModel(context.events);
    const validationError = this.validate(contextModel);

    if (validationError) {
      return validationError;
    }

    const event = this.createEvent(request);
    await this.eventStore.append([event], contextQuery, context.maxSequenceNumber);

    return {
      status: true,
      message: "Kaffeekauf wurde gespeichert.",
      eventId: String(event.payload.coffeePurchasedId),
    };
  }

  private checkPlausibility(
    request: RecordCoffeePurchasedCommand,
  ): CommandResponse | null {
    if (!isNonEmptyString(request.participantRegisteredId)) {
      return {
        status: false,
        message: "participantRegisteredId muss gesetzt sein.",
      };
    }

    if (!Number.isFinite(request.amountEuro) || request.amountEuro <= 0) {
      return {
        status: false,
        message: "amountEuro muss größer als 0 sein.",
      };
    }

    return null;
  }

  private buildContextModel(events: EventRecord[]): ParticipantContextModel {
    let exists = false;
    let active = false;

    for (const event of events) {
      if (event.eventType === eventTypes.participantRegistered) {
        exists = true;
        active = true;
      }

      if (event.eventType === eventTypes.participantDeregistered) {
        active = false;
      }
    }

    return { exists, active };
  }

  private validate(contextModel: ParticipantContextModel): CommandResponse | null {
    if (!contextModel.exists) {
      return {
        status: false,
        message: "Teilnehmer wurde nicht gefunden.",
      };
    }

    if (!contextModel.active) {
      return {
        status: false,
        message: "Abgemeldete Teilnehmer können keinen Kaffee kaufen.",
      };
    }

    return null;
  }

  private createEvent(request: RecordCoffeePurchasedCommand): Event {
    return {
      eventType: eventTypes.coffeePurchased,
      payload: {
        coffeePurchasedId: randomUUID(),
        amountEuro: request.amountEuro,
        scopes: {
          participantRegisteredId: request.participantRegisteredId.trim(),
        },
      },
    };
  }
}
