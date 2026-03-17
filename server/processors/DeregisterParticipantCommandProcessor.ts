import { type Event, type EventRecord, type EventStore } from "@ricofritzsche/eventstore";
import { randomUUID } from "node:crypto";
import {
  createParticipantContextQuery,
  eventTypes,
  isNonEmptyString,
} from "../domain/events.ts";
import type {
  CommandResponse,
  DeregisterParticipantCommand,
} from "../domain/requests.ts";

type ParticipantContextModel = {
  exists: boolean;
  active: boolean;
};

export class DeregisterParticipantCommandProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(
    request: DeregisterParticipantCommand,
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
      message: "Teilnehmer wurde abgemeldet.",
      eventId: String(event.payload.participantDeregisteredId),
    };
  }

  private checkPlausibility(
    request: DeregisterParticipantCommand,
  ): CommandResponse | null {
    if (!isNonEmptyString(request.participantRegisteredId)) {
      return {
        status: false,
        message: "participantRegisteredId muss gesetzt sein.",
      };
    }

    if (
      request.deregisteredOn !== undefined &&
      !isNonEmptyString(request.deregisteredOn)
    ) {
      return {
        status: false,
        message: "deregisteredOn muss ein nicht-leerer String sein.",
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
        message: "Teilnehmer ist bereits abgemeldet.",
      };
    }

    return null;
  }

  private createEvent(request: DeregisterParticipantCommand): Event {
    return {
      eventType: eventTypes.participantDeregistered,
      payload: {
        participantDeregisteredId: randomUUID(),
        deregisteredOn: request.deregisteredOn?.trim() ?? new Date().toISOString(),
        scopes: {
          participantRegisteredId: request.participantRegisteredId.trim(),
        },
      },
    };
  }
}
