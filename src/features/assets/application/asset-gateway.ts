import type { AssetDraft, AssetType, AssetUpdate } from '@/features/assets/domain/asset';

export type AssetItem = { id: string; householdId: string; name: string; type: AssetType; balance: string; currency: string };
export interface AssetGateway {
  list(householdId: string): Promise<AssetItem[]>;
  getById(householdId: string, id: string): Promise<AssetItem>;
  create(draft: AssetDraft): Promise<string>;
  update(draft: AssetUpdate): Promise<string>;
}
