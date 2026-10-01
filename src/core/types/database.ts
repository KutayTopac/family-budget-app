export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
type Timestamps = { created_at: string; updated_at: string };

export type Profile = Timestamps & { id: string; display_name: string | null; avatar_url: string | null };
export type Household = Timestamps & {
  id: string; name: string; base_currency: string; timezone: string; created_by: string;
};
export type HouseholdMember = {
  household_id: string; user_id: string; role: 'owner' | 'member'; status: 'active' | 'left'; joined_at: string;
};
export type Account = Timestamps & {
  id: string; household_id: string; name: string;
  type: 'cash' | 'checking' | 'savings' | 'credit' | 'investment' | 'debt';
  currency: string; opening_balance: string; owner_member_id: string | null; is_archived: boolean;
};
export type Category = Timestamps & {
  id: string; household_id: string; name: string; type: 'income' | 'expense';
  parent_id: string | null; icon: string | null; color: string | null; is_active: boolean;
};
export type Transaction = Timestamps & {
  id: string; household_id: string; account_id: string; type: 'income' | 'expense' | 'transfer';
  amount: string; currency: string; category_id: string | null; description: string | null;
  occurred_at: string; added_by: string; spent_by: string | null; status: 'posted' | 'voided';
  client_request_id: string; version: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile,
        { id: string; display_name?: string | null; avatar_url?: string | null },
        { display_name?: string | null; avatar_url?: string | null; updated_at?: string }>;
      households: Table<Household,
        { id?: string; name: string; base_currency?: string; timezone?: string; created_by: string },
        Partial<Omit<Household, 'id' | 'created_by' | 'created_at'>>>;
      household_members: Table<HouseholdMember,
        { household_id: string; user_id: string; role?: 'owner' | 'member'; status?: 'active' | 'left' },
        { role?: 'owner' | 'member'; status?: 'active' | 'left' }>;
      accounts: Table<Account,
        { id?: string; household_id: string; name: string; type: Account['type']; currency?: string; opening_balance?: string; owner_member_id?: string | null; is_archived?: boolean },
        Partial<Omit<Account, 'id' | 'household_id' | 'created_at'>>>;
      categories: Table<Category,
        { id?: string; household_id: string; name: string; type: Category['type']; parent_id?: string | null; icon?: string | null; color?: string | null; is_active?: boolean },
        Partial<Omit<Category, 'id' | 'household_id' | 'created_at'>>>;
      transactions: Table<Transaction,
        { id?: string; household_id: string; account_id: string; type: Transaction['type']; amount: string; currency?: string; category_id?: string | null; description?: string | null; occurred_at: string; added_by: string; spent_by?: string | null; status?: Transaction['status']; client_request_id: string; version?: number },
        Partial<Omit<Transaction, 'id' | 'household_id' | 'added_by' | 'created_at'>>>;
    };
    Views: Record<string, never>;
    Functions: {
      create_household: {
        Args: { household_name: string; household_currency?: string };
        Returns: string;
      };
      create_household_invitation: {
        Args: { target_household_id: string; valid_for_minutes?: number };
        Returns: { invitation_code: string; invitation_expires_at: string }[];
      };
      accept_household_invitation: {
        Args: { invitation_code: string };
        Returns: string;
      };
      create_financial_transaction: {
        Args: {
          target_household_id: string;
          target_account_id: string;
          transaction_type: 'income' | 'expense';
          transaction_amount: string;
          transaction_currency: string;
          target_category_id: string;
          transaction_description: string;
          transaction_occurred_at: string;
          transaction_spent_by: string | null;
          request_id: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
