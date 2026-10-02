begin;

insert into public.categories (household_id, name, type, icon, color)
select h.id, defaults.name, 'expense', defaults.icon, defaults.color
from public.households h
cross join (values
  ('Kira', 'home', '#0F766E'),
  ('Eğlence', 'celebration', '#DB2777')
) as defaults(name, icon, color)
on conflict (household_id, type, name) do nothing;

create or replace function public.update_financial_transaction(
  target_transaction_id uuid,
  target_household_id uuid,
  target_account_id uuid,
  transaction_type text,
  transaction_amount numeric,
  transaction_currency text,
  target_category_id uuid,
  transaction_description text,
  transaction_occurred_at timestamptz,
  transaction_spent_by uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_currency text := upper(trim(transaction_currency));
begin
  if auth.uid() is null or not private.is_household_member(target_household_id) then
    raise exception 'Active household membership required';
  end if;
  if transaction_type not in ('income', 'expense') then
    raise exception 'Transaction type must be income or expense';
  end if;
  if transaction_amount <= 0 or transaction_amount > 9999999999999999.9999 then
    raise exception 'Transaction amount is outside the allowed range';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency code';
  end if;
  if transaction_description is not null and char_length(trim(transaction_description)) > 500 then
    raise exception 'Description is too long';
  end if;
  if not exists (
    select 1 from public.accounts a
    where a.id = target_account_id and a.household_id = target_household_id and not a.is_archived
  ) then
    raise exception 'Account is unavailable';
  end if;
  if not exists (
    select 1 from public.categories c
    where c.id = target_category_id and c.household_id = target_household_id
      and c.type = transaction_type and c.is_active
  ) then
    raise exception 'Category does not match the transaction type';
  end if;
  if transaction_spent_by is not null and not exists (
    select 1 from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = transaction_spent_by and hm.status = 'active'
  ) then
    raise exception 'Selected household member is unavailable';
  end if;

  update public.transactions
  set account_id = target_account_id,
      type = transaction_type,
      amount = transaction_amount,
      currency = normalized_currency,
      category_id = target_category_id,
      description = nullif(trim(transaction_description), ''),
      occurred_at = transaction_occurred_at,
      spent_by = case when transaction_type = 'expense' then transaction_spent_by else null end,
      version = version + 1
  where id = target_transaction_id
    and household_id = target_household_id
    and status = 'posted';

  if not found then raise exception 'Transaction not found'; end if;
  return target_transaction_id;
end;
$$;

create or replace function public.delete_financial_transaction(
  target_transaction_id uuid,
  target_household_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_household_member(target_household_id) then
    raise exception 'Active household membership required';
  end if;

  delete from public.transactions
  where id = target_transaction_id and household_id = target_household_id;

  if not found then raise exception 'Transaction not found'; end if;
  return target_transaction_id;
end;
$$;

revoke all on function public.update_financial_transaction(
  uuid, uuid, uuid, text, numeric, text, uuid, text, timestamptz, uuid
) from public, anon;
revoke all on function public.delete_financial_transaction(uuid, uuid) from public, anon;
grant execute on function public.update_financial_transaction(
  uuid, uuid, uuid, text, numeric, text, uuid, text, timestamptz, uuid
) to authenticated;
grant execute on function public.delete_financial_transaction(uuid, uuid) to authenticated;

commit;
