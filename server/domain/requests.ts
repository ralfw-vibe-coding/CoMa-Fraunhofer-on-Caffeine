export type CommandResponse = {
  status: boolean;
  message: string;
  eventId?: string;
};

export type RegisterParticipantCommand = {
  displayName: string;
  registeredOn?: string;
};

export type DeregisterParticipantCommand = {
  participantRegisteredId: string;
  deregisteredOn?: string;
};

export type RecordCoffeeDrawnCommand = {
  participantRegisteredId: string;
};

export type RecordCoffeeSupplyDepletedCommand = Record<string, never>;

export type RecordCoffeePurchasedCommand = {
  participantRegisteredId: string;
  amountEuro: number;
};

export type ListParticipantsQueryResult = {
  participants: Array<{
    participantRegisteredId: string;
    displayName: string;
  }>;
};

export type RankingUrgency = "low" | "medium" | "high";

export type ListWhoIsNextToBuyCoffeeQueryResult = {
  ranking: string[];
  urgency: RankingUrgency;
};
