import { type Event, type EventStore } from "@ricofritzsche/eventstore";
import { randomUUID } from "node:crypto";
import { eventTypes, isNonEmptyString } from "../domain/events.ts";
import type {
  CommandResponse,
  RegisterParticipantCommand,
} from "../domain/requests.ts";

export class RegisterParticipantCommandProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(
    request: RegisterParticipantCommand,
  ): Promise<CommandResponse> {
    const plausibilityError = this.checkPlausibility(request);
    if (plausibilityError) {
      return plausibilityError;
    }

    const event = this.createEvent(request);
    await this.eventStore.append([event]);

    return {
      status: true,
      message: "Teilnehmer wurde registriert.",
      eventId: String(event.payload.participantRegisteredId),
    };
  }

  private checkPlausibility(
    request: RegisterParticipantCommand,
  ): CommandResponse | null {
    if (!isNonEmptyString(request.displayName)) {
      return {
        status: false,
        message: "displayName muss gesetzt sein.",
      };
    }

    if (request.registeredOn !== undefined && !isNonEmptyString(request.registeredOn)) {
      return {
        status: false,
        message: "registeredOn muss ein nicht-leerer String sein.",
      };
    }

    return null;
  }

  private createEvent(request: RegisterParticipantCommand): Event {
    return {
      eventType: eventTypes.participantRegistered,
      payload: {
        participantRegisteredId: randomUUID(),
        displayName: request.displayName.trim(),
        registeredOn: request.registeredOn?.trim() ?? new Date().toISOString(),
      },
    };
  }
}
