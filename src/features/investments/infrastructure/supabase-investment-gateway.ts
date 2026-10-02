import { supabase } from '@/core/supabase/client';
import type { InvestmentGateway, InvestmentItem } from '@/features/investments/application/investment-gateway';

async function load(householdId: string, id?: string) {
  let query = supabase.from('investment_trades').select('id, household_id, instrument_id, quantity, unit_price, current_unit_price, currency, traded_at').eq('household_id', householdId).eq('type', 'buy').order('traded_at', { ascending: false });
  if (id) query = query.eq('id', id);
  const { data: trades, error } = await query; if (error) throw error;
  const ids = [...new Set(trades.map((trade) => trade.instrument_id))];
  const { data: instruments, error: instrumentError } = ids.length ? await supabase.from('instruments').select('id, symbol, name, asset_class').in('id', ids) : { data: [], error: null };
  if (instrumentError) throw instrumentError;
  const map = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  return trades.map<InvestmentItem>((trade) => { const instrument = map.get(trade.instrument_id); return { id: trade.id, householdId: trade.household_id, assetClass: instrument?.asset_class as InvestmentItem['assetClass'], symbol: instrument?.symbol ?? '-', name: instrument?.name ?? 'Yatırım', quantity: String(trade.quantity), unitCost: String(trade.unit_price), currentPrice: String(trade.current_unit_price), currency: trade.currency, tradedAt: trade.traded_at }; });
}
export const supabaseInvestmentGateway: InvestmentGateway = {
  list: (householdId) => load(householdId),
  async getById(householdId, id) { const [item] = await load(householdId, id); if (!item) throw new Error('Yatırım bulunamadı.'); return item; },
  async create(draft) { const { data, error } = await supabase.rpc('create_investment', { target_household_id: draft.householdId, investment_asset_class: draft.assetClass, investment_symbol: draft.symbol, investment_name: draft.name, investment_quantity: draft.quantity, investment_unit_cost: draft.unitCost, investment_current_price: draft.currentPrice, investment_currency: draft.currency, investment_traded_at: draft.tradedAt }); if (error) throw error; return data; },
  async updatePrice(draft) { const { data, error } = await supabase.rpc('update_investment_price', { target_trade_id: draft.id, target_household_id: draft.householdId, investment_current_price: draft.currentPrice }); if (error) throw error; return data; },
};
