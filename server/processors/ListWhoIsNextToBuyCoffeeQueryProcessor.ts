import { type EventRecord, type EventStore } from "@ricofritzsche/eventstore";
import { createRankingQuery } from "../domain/events.ts";
import { projectRanking } from "../domain/projections.ts";
import type { ListWhoIsNextToBuyCoffeeQueryResult } from "../domain/requests.ts";

export class ListWhoIsNextToBuyCoffeeQueryProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(): Promise<ListWhoIsNextToBuyCoffeeQueryResult> {
    const context = await this.loadContext();
    const contextModel = this.buildContextModel(context.events);
    return this.projectResult(contextModel);
  }

  private async loadContext() {
    return this.eventStore.query(createRankingQuery());
  }

  private buildContextModel(events: EventRecord[]) {
    return projectRanking(events);
  }

  private projectResult(
    contextModel: ListWhoIsNextToBuyCoffeeQueryResult,
  ): ListWhoIsNextToBuyCoffeeQueryResult {
    return contextModel;
  }
}
