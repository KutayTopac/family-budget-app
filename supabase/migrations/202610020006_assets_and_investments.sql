begin;

alter table public.accounts add column if not exists current_balance numeric(20, 4) not null default 0;
update public.accounts set current_balance = opening_balance where current_balance = 0 and opening_balance <> 0;

alter table public.investment_trades add column if not exists current_unit_price numeric(28, 10);
alter table public.investment_trades add column if not exists updated_at timestamptz not null default now();
update public.investment_trades set current_unit_price = unit_price where current_unit_price is null;
alter table public.investment_trades alter column current_unit_price set not null;
alter table public.investment_trades add constraint investment_trades_current_price_nonnegative check (current_unit_price >= 0);
create trigger investment_trades_set_updated_at before update on public.investment_trades
for each row execute procedure public.set_updated_at();

create or replace function public.create_asset(
  target_household_id uuid, asset_name text, asset_type text, asset_balance numeric, asset_currency text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare created_id uuid; normalized_currency text := upper(trim(asset_currency));
begin
  if auth.uid() is null or not private.is_household_member(target_household_id) then raise exception 'Active household membership required'; end if;
  if char_length(trim(asset_name)) not between 1 and 80 then raise exception 'Asset name is invalid'; end if;
  if asset_type not in ('cash', 'checking', 'savings') then raise exception 'Asset type is invalid'; end if;
  if asset_balance < 0 then raise exception 'Balance cannot be negative'; end if;
  if normalized_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid currency code'; end if;
  insert into public.accounts (household_id, name, type, currency, opening_balance, current_balance)
  values (target_household_id, trim(asset_name), asset_type, normalized_currency, asset_balance, asset_balance)
  returning id into created_id;
  return created_id;
end; $$;

create or replace function public.update_asset(
  target_asset_id uuid, target_household_id uuid, asset_name text, asset_type text, asset_balance numeric, asset_currency text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare normalized_currency text := upper(trim(asset_currency));
begin
  if auth.uid() is null or not private.is_household_member(target_household_id) then raise exception 'Active household membership required'; end if;
  if char_length(trim(asset_name)) not between 1 and 80 then raise exception 'Asset name is invalid'; end if;
  if asset_type not in ('cash', 'checking', 'savings') then raise exception 'Asset type is invalid'; end if;
  if asset_balance < 0 then raise exception 'Balance cannot be negative'; end if;
  update public.accounts set name=trim(asset_name), type=asset_type, current_balance=asset_balance, currency=normalized_currency
  where id=target_asset_id and household_id=target_household_id and type in ('cash','checking','savings') and not is_archived;
  if not found then raise exception 'Asset not found'; end if;
  return target_asset_id;
end; $$;

create or replace function public.create_investment(
  target_household_id uuid, investment_asset_class text, investment_symbol text, investment_name text,
  investment_quantity numeric, investment_unit_cost numeric, investment_current_price numeric,
  investment_currency text, investment_traded_at timestamptz
) returns uuid language plpgsql security definer set search_path = '' as $$
declare instrument_uuid uuid; account_uuid uuid; created_id uuid; normalized_symbol text := upper(trim(investment_symbol)); normalized_currency text := upper(trim(investment_currency));
begin
  if auth.uid() is null or not private.is_household_member(target_household_id) then raise exception 'Active household membership required'; end if;
  if investment_asset_class not in ('fx','gold','stock','fund','crypto') then raise exception 'Investment type is invalid'; end if;
  if char_length(trim(investment_name)) not between 1 and 120 or char_length(normalized_symbol) not between 1 and 30 then raise exception 'Instrument is invalid'; end if;
  if investment_quantity <= 0 or investment_unit_cost < 0 or investment_current_price < 0 then raise exception 'Investment values are invalid'; end if;
  if normalized_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid currency code'; end if;
  insert into public.instruments (symbol, exchange, name, asset_class, currency)
  values (normalized_symbol, '', trim(investment_name), investment_asset_class, normalized_currency)
  on conflict (symbol, exchange) do update set name=excluded.name, asset_class=excluded.asset_class, currency=excluded.currency
  returning id into instrument_uuid;
  select id into account_uuid from public.accounts where household_id=target_household_id and type='investment' and not is_archived limit 1;
  if account_uuid is null then
    insert into public.accounts (household_id,name,type,currency) values (target_household_id,'Yatırım Portföyü','investment',normalized_currency) returning id into account_uuid;
  end if;
  insert into public.investment_trades (household_id,account_id,instrument_id,type,quantity,unit_price,current_unit_price,currency,traded_at,added_by)
  values (target_household_id,account_uuid,instrument_uuid,'buy',investment_quantity,investment_unit_cost,investment_current_price,normalized_currency,investment_traded_at,auth.uid()) returning id into created_id;
  return created_id;
end; $$;

create or replace function public.update_investment_price(target_trade_id uuid, target_household_id uuid, investment_current_price numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_household_member(target_household_id) then raise exception 'Active household membership required'; end if;
  if investment_current_price < 0 then raise exception 'Current price cannot be negative'; end if;
  update public.investment_trades set current_unit_price=investment_current_price where id=target_trade_id and household_id=target_household_id;
  if not found then raise exception 'Investment not found'; end if;
  return target_trade_id;
end; $$;

revoke all on function public.create_asset(uuid,text,text,numeric,text) from public,anon;
revoke all on function public.update_asset(uuid,uuid,text,text,numeric,text) from public,anon;
revoke all on function public.create_investment(uuid,text,text,text,numeric,numeric,numeric,text,timestamptz) from public,anon;
revoke all on function public.update_investment_price(uuid,uuid,numeric) from public,anon;
grant execute on function public.create_asset(uuid,text,text,numeric,text) to authenticated;
grant execute on function public.update_asset(uuid,uuid,text,text,numeric,text) to authenticated;
grant execute on function public.create_investment(uuid,text,text,text,numeric,numeric,numeric,text,timestamptz) to authenticated;
grant execute on function public.update_investment_price(uuid,uuid,numeric) to authenticated;

commit;
