import { type Event, type EventStore } from "@ricofritzsche/eventstore";
import { randomUUID } from "node:crypto";
import { eventTypes } from "../domain/events";
import type {
  CommandResponse,
  RecordCoffeeSupplyDepletedCommand,
} from "../domain/requests";

export class RecordCoffeeSupplyDepletedCommandProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(
    _request: RecordCoffeeSupplyDepletedCommand,
  ): Promise<CommandResponse> {
    const event = this.createEvent();
    await this.eventStore.append([event]);

    return {
      status: true,
      message: "Leerer Vorrat wurde gespeichert.",
      eventId: String(event.payload.coffeeSupplyDepletedId),
    };
  }

  private createEvent(): Event {
    return {
      eventType: eventTypes.coffeeSupplyDepleted,
      payload: {
        coffeeSupplyDepletedId: randomUUID(),
      },
    };
  }
}
