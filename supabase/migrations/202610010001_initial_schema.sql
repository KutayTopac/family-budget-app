begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.protect_transaction_ownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'household_id cannot be changed';
  end if;
  if new.added_by is distinct from old.added_by then
    raise exception 'added_by cannot be changed';
  end if;
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 2 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  base_currency text not null default 'TRY' check (base_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Europe/Istanbul',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'left')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code_hash text not null unique,
  invited_email_hash text,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  type text not null check (type in ('income', 'expense')),
  parent_id uuid,
  icon text,
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, type, name),
  unique (id, household_id),
  foreign key (parent_id, household_id) references public.categories(id, household_id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (household_id, name),
  unique (id, household_id)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_member_id uuid,
  name text not null check (char_length(name) between 1 and 80),
  type text not null check (type in ('cash', 'checking', 'savings', 'credit', 'investment', 'debt')),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  opening_balance numeric(20, 4) not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (household_id, owner_member_id)
    references public.household_members(household_id, user_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(20, 4) not null check (amount > 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  category_id uuid,
  description text check (description is null or char_length(description) <= 500),
  occurred_at timestamptz not null,
  added_by uuid not null,
  spent_by uuid,
  status text not null default 'posted' check (status in ('posted', 'voided')),
  client_request_id uuid not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, client_request_id),
  unique (id, household_id),
  foreign key (account_id, household_id) references public.accounts(id, household_id),
  foreign key (category_id, household_id) references public.categories(id, household_id),
  foreign key (household_id, added_by) references public.household_members(household_id, user_id),
  foreign key (household_id, spent_by) references public.household_members(household_id, user_id)
);

create table public.transaction_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_id uuid not null,
  account_id uuid not null,
  direction text not null check (direction in ('debit', 'credit')),
  amount numeric(20, 4) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  base_amount numeric(20, 4) not null,
  created_at timestamptz not null default now(),
  foreign key (transaction_id, household_id) references public.transactions(id, household_id) on delete cascade,
  foreign key (account_id, household_id) references public.accounts(id, household_id)
);

create table public.transaction_tags (
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_id uuid not null,
  tag_id uuid not null,
  primary key (transaction_id, tag_id),
  foreign key (transaction_id, household_id) references public.transactions(id, household_id) on delete cascade,
  foreign key (tag_id, household_id) references public.tags(id, household_id) on delete cascade
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null,
  month date not null check (month = date_trunc('month', month)::date),
  limit_amount numeric(20, 4) not null check (limit_amount > 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, category_id, month),
  foreign key (category_id, household_id) references public.categories(id, household_id)
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  target_amount numeric(20, 4) not null check (target_amount > 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  target_date date,
  linked_account_id uuid,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (linked_account_id, household_id) references public.accounts(id, household_id)
);

create table public.instruments (
  id uuid primary key default gen_random_uuid(),
  symbol text not null, exchange text not null default '', name text not null,
  asset_class text not null check (asset_class in ('fx', 'gold', 'stock', 'fund', 'crypto')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  isin text, created_at timestamptz not null default now(), unique (symbol, exchange)
);

create table public.investment_trades (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null,
  instrument_id uuid not null references public.instruments(id),
  type text not null check (type in ('buy', 'sell', 'dividend', 'coupon', 'split')),
  quantity numeric(28, 10) not null check (quantity > 0),
  unit_price numeric(28, 10) not null check (unit_price >= 0),
  fees numeric(20, 4) not null default 0 check (fees >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  traded_at timestamptz not null,
  added_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key (account_id, household_id) references public.accounts(id, household_id),
  foreign key (household_id, added_by) references public.household_members(household_id, user_id)
);

create table public.market_prices (
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  price numeric(28, 10) not null check (price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  as_of timestamptz not null, source text not null,
  quality text not null default 'official' check (quality in ('official', 'delayed', 'estimated')),
  fetched_at timestamptz not null default now(), primary key (instrument_id, as_of, source)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null, entity_id uuid, action text not null,
  before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);

create index household_members_user_id_idx on public.household_members(user_id) where status = 'active';
create index household_invitations_household_idx on public.household_invitations(household_id);
create index categories_household_idx on public.categories(household_id);
create index tags_household_idx on public.tags(household_id);
create index accounts_household_idx on public.accounts(household_id);
create index transactions_household_occurred_idx on public.transactions(household_id, occurred_at desc);
create index transactions_category_occurred_idx on public.transactions(household_id, category_id, occurred_at desc);
create index transaction_entries_household_idx on public.transaction_entries(household_id, transaction_id);
create index budgets_household_month_idx on public.budgets(household_id, month);
create index savings_goals_household_idx on public.savings_goals(household_id);
create index investment_trades_household_idx on public.investment_trades(household_id, traded_at desc);
create index market_prices_latest_idx on public.market_prices(instrument_id, as_of desc);
create index audit_events_household_created_idx on public.audit_events(household_id, created_at desc);

create or replace function private.is_household_member(target_household_id uuid) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid()) and hm.status = 'active'
  );
$$;

create or replace function private.is_household_owner(target_household_id uuid) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid()) and hm.role = 'owner' and hm.status = 'active'
  );
$$;

create or replace function private.is_household_creator(target_household_id uuid) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.households h
    where h.id = target_household_id and h.created_by = (select auth.uid())
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.is_household_member(uuid) from public;
revoke all on function private.is_household_owner(uuid) from public;
revoke all on function private.is_household_creator(uuid) from public;
grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.is_household_owner(uuid) to authenticated;
grant execute on function private.is_household_creator(uuid) to authenticated;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.protect_transaction_ownership() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger households_set_updated_at before update on public.households for each row execute procedure public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
create trigger accounts_set_updated_at before update on public.accounts for each row execute procedure public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute procedure public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets for each row execute procedure public.set_updated_at();
create trigger savings_goals_set_updated_at before update on public.savings_goals for each row execute procedure public.set_updated_at();
create trigger transactions_protect_ownership before update on public.transactions
for each row execute procedure public.protect_transaction_ownership();
create trigger investment_trades_protect_ownership before update on public.investment_trades
for each row execute procedure public.protect_transaction_ownership();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_entries enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.instruments enable row level security;
alter table public.investment_trades enable row level security;
alter table public.market_prices enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.households, public.household_members,
  public.household_invitations, public.categories, public.tags, public.accounts,
  public.transactions, public.transaction_entries, public.transaction_tags,
  public.budgets, public.savings_goals, public.investment_trades to authenticated;
grant select on public.instruments, public.market_prices, public.audit_events to authenticated;

create policy profiles_select_self on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_self on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy households_select_member on public.households for select to authenticated using ((select private.is_household_member(id)));
create policy households_insert_creator on public.households for insert to authenticated with check ((select auth.uid()) = created_by);
create policy households_update_owner on public.households for update to authenticated
using ((select private.is_household_owner(id))) with check ((select private.is_household_owner(id)));
create policy households_delete_owner on public.households for delete to authenticated using ((select private.is_household_owner(id)));

create policy members_select_member on public.household_members for select to authenticated using ((select private.is_household_member(household_id)));
create policy members_bootstrap_owner on public.household_members for insert to authenticated with check (
  user_id = (select auth.uid()) and role = 'owner'
  and (select private.is_household_creator(household_id))
);
create policy members_update_owner on public.household_members for update to authenticated
using ((select private.is_household_owner(household_id))) with check ((select private.is_household_owner(household_id)));
create policy members_delete_self_or_owner on public.household_members for delete to authenticated
using (user_id = (select auth.uid()) or (select private.is_household_owner(household_id)));

create policy invitations_select_owner on public.household_invitations for select to authenticated using ((select private.is_household_owner(household_id)));
create policy invitations_insert_owner on public.household_invitations for insert to authenticated
with check ((select private.is_household_owner(household_id)) and created_by = (select auth.uid()));
create policy invitations_update_owner on public.household_invitations for update to authenticated
using ((select private.is_household_owner(household_id))) with check ((select private.is_household_owner(household_id)));
create policy invitations_delete_owner on public.household_invitations for delete to authenticated using ((select private.is_household_owner(household_id)));

do $$
declare table_name text;
begin
  foreach table_name in array array['categories','tags','accounts','transaction_entries','transaction_tags','budgets','savings_goals'] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_household_member(household_id)))', table_name || '_select_member', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_household_member(household_id)))', table_name || '_insert_member', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_household_member(household_id))) with check ((select private.is_household_member(household_id)))', table_name || '_update_member', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_household_member(household_id)))', table_name || '_delete_member', table_name);
  end loop;
end;
$$;

create policy transactions_select_member on public.transactions for select to authenticated
using ((select private.is_household_member(household_id)));
create policy transactions_insert_member on public.transactions for insert to authenticated
with check ((select private.is_household_member(household_id)) and added_by = (select auth.uid()));
create policy transactions_update_member on public.transactions for update to authenticated
using ((select private.is_household_member(household_id)))
with check ((select private.is_household_member(household_id)));
create policy transactions_delete_member on public.transactions for delete to authenticated
using ((select private.is_household_member(household_id)));

create policy investment_trades_select_member on public.investment_trades for select to authenticated
using ((select private.is_household_member(household_id)));
create policy investment_trades_insert_member on public.investment_trades for insert to authenticated
with check ((select private.is_household_member(household_id)) and added_by = (select auth.uid()));
create policy investment_trades_update_member on public.investment_trades for update to authenticated
using ((select private.is_household_member(household_id)))
with check ((select private.is_household_member(household_id)));
create policy investment_trades_delete_member on public.investment_trades for delete to authenticated
using ((select private.is_household_member(household_id)));

create policy instruments_select_authenticated on public.instruments for select to authenticated using (true);
create policy market_prices_select_authenticated on public.market_prices for select to authenticated using (true);
create policy audit_events_select_member on public.audit_events for select to authenticated using ((select private.is_household_member(household_id)));

commit;
