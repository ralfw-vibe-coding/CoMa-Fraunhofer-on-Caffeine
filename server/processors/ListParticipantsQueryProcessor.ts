import { type EventRecord, type EventStore } from "@ricofritzsche/eventstore";
import { createParticipantListQuery } from "../domain/events";
import { projectParticipants } from "../domain/projections";
import type { ListParticipantsQueryResult } from "../domain/requests";

export class ListParticipantsQueryProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(): Promise<ListParticipantsQueryResult> {
    const context = await this.loadContext();
    const contextModel = this.buildContextModel(context.events);
    return this.projectResult(contextModel);
  }

  private async loadContext() {
    return this.eventStore.query(createParticipantListQuery());
  }

  private buildContextModel(events: EventRecord[]) {
    return projectParticipants(events);
  }

  private projectResult(
    contextModel: ListParticipantsQueryResult,
  ): ListParticipantsQueryResult {
    return contextModel;
  }
}
