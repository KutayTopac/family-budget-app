export type HouseholdSummary = {
  id: string;
  name: string;
  baseCurrency: string;
  role: 'owner' | 'member';
};

export type Invitation = { code: string; expiresAt: string };

export interface HouseholdGateway {
  findMine(userId: string): Promise<HouseholdSummary | null>;
  create(name: string, currency: string): Promise<string>;
  createInvitation(householdId: string): Promise<Invitation>;
  acceptInvitation(code: string): Promise<string>;
}
