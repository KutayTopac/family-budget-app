import { supabase } from '@/core/supabase/client';
import type { AssetGateway, AssetItem } from '@/features/assets/application/asset-gateway';

const mapAsset = (item: { id: string; household_id: string; name: string; type: string; current_balance: string; currency: string }): AssetItem => ({
  id: item.id, householdId: item.household_id, name: item.name, type: item.type as AssetItem['type'], balance: String(item.current_balance), currency: item.currency,
});
export const supabaseAssetGateway: AssetGateway = {
  async list(householdId) {
    const { data, error } = await supabase.from('accounts').select('id, household_id, name, type, current_balance, currency').eq('household_id', householdId).in('type', ['cash', 'checking', 'savings']).eq('is_archived', false).order('name');
    if (error) throw error; return data.map(mapAsset);
  },
  async getById(householdId, id) {
    const { data, error } = await supabase.from('accounts').select('id, household_id, name, type, current_balance, currency').eq('household_id', householdId).eq('id', id).single();
    if (error) throw error; return mapAsset(data);
  },
  async create(draft) {
    const { data, error } = await supabase.rpc('create_asset', { target_household_id: draft.householdId, asset_name: draft.name, asset_type: draft.type, asset_balance: draft.balance, asset_currency: draft.currency });
    if (error) throw error; return data;
  },
  async update(draft) {
    const { data, error } = await supabase.rpc('update_asset', { target_asset_id: draft.id, target_household_id: draft.householdId, asset_name: draft.name, asset_type: draft.type, asset_balance: draft.balance, asset_currency: draft.currency });
    if (error) throw error; return data;
  },
};
