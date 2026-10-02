import type { AssetGateway } from '@/features/assets/application/asset-gateway';
import { assetDraftSchema, assetUpdateSchema, type AssetDraft, type AssetUpdate } from '@/features/assets/domain/asset';
import { z } from 'zod';
const uuid = z.uuid();
export const createAssetService = (gateway: AssetGateway) => ({
  getAssets: (householdId: string) => gateway.list(uuid.parse(householdId)),
  getAsset: (householdId: string, id: string) => gateway.getById(uuid.parse(householdId), uuid.parse(id)),
  addAsset: (draft: AssetDraft) => gateway.create(assetDraftSchema.parse(draft)),
  updateAsset: (draft: AssetUpdate) => gateway.update(assetUpdateSchema.parse(draft)),
});
