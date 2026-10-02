begin;

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
  on conflict (symbol, exchange) do nothing;
  select id into instrument_uuid from public.instruments where symbol=normalized_symbol and exchange='';

  select id into account_uuid from public.accounts where household_id=target_household_id and type='investment' and not is_archived limit 1;
  if account_uuid is null then
    insert into public.accounts (household_id,name,type,currency) values (target_household_id,'Yatırım Portföyü','investment',normalized_currency) returning id into account_uuid;
  end if;
  insert into public.investment_trades (household_id,account_id,instrument_id,type,quantity,unit_price,current_unit_price,currency,traded_at,added_by)
  values (target_household_id,account_uuid,instrument_uuid,'buy',investment_quantity,investment_unit_cost,investment_current_price,normalized_currency,investment_traded_at,auth.uid()) returning id into created_id;
  return created_id;
end; $$;

revoke all on function public.create_investment(uuid,text,text,text,numeric,numeric,numeric,text,timestamptz) from public,anon;
grant execute on function public.create_investment(uuid,text,text,text,numeric,numeric,numeric,text,timestamptz) to authenticated;

commit;
