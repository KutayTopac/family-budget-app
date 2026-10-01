import { supabase } from '@/core/supabase/client';
import type { HouseholdGateway } from '@/features/households/application/household-gateway';

export const supabaseHouseholdGateway: HouseholdGateway = {
  async findMine(userId) {
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return null;

    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('id, name, base_currency')
      .eq('id', membership.household_id)
      .single();
    if (householdError) throw householdError;
    return {
      id: household.id,
      name: household.name,
      baseCurrency: household.base_currency,
      role: membership.role,
    };
  },
  async create(name, currency) {
    const { data, error } = await supabase.rpc('create_household', {
      household_name: name,
      household_currency: currency,
    });
    if (error) throw error;
    return data;
  },
  async createInvitation(householdId) {
    const { data, error } = await supabase.rpc('create_household_invitation', {
      target_household_id: householdId,
      valid_for_minutes: 1440,
    });
    if (error) throw error;
    const invitation = data[0];
    if (!invitation) throw new Error('Davet kodu oluşturulamadı.');
    return { code: invitation.invitation_code, expiresAt: invitation.invitation_expires_at };
  },
  async acceptInvitation(code) {
    const { data, error } = await supabase.rpc('accept_household_invitation', { invitation_code: code });
    if (error) throw error;
    return data;
  },
};
