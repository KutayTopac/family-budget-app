begin;

insert into public.accounts (household_id, name, type, currency)
select h.id, 'Ortak Nakit', 'cash', h.base_currency
from public.households h
where not exists (
  select 1 from public.accounts a where a.household_id = h.id and not a.is_archived
);

create policy profiles_select_household_member
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.household_members target
    where target.user_id = profiles.id
      and target.status = 'active'
      and private.is_household_member(target.household_id)
  )
);

create or replace function public.create_financial_transaction(
  target_household_id uuid,
  target_account_id uuid,
  transaction_type text,
  transaction_amount numeric,
  transaction_currency text,
  target_category_id uuid,
  transaction_description text,
  transaction_occurred_at timestamptz,
  transaction_spent_by uuid,
  request_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_transaction_id uuid;
  normalized_currency text := upper(trim(transaction_currency));
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not private.is_household_member(target_household_id) then
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
  if transaction_occurred_at is null then
    raise exception 'Transaction date is required';
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

  insert into public.transactions (
    household_id, account_id, type, amount, currency, category_id,
    description, occurred_at, added_by, spent_by, client_request_id
  ) values (
    target_household_id, target_account_id, transaction_type, transaction_amount,
    normalized_currency, target_category_id, nullif(trim(transaction_description), ''),
    transaction_occurred_at, current_user_id, transaction_spent_by, request_id
  )
  on conflict (household_id, client_request_id) do nothing
  returning id into created_transaction_id;

  if created_transaction_id is null then
    select id into created_transaction_id
    from public.transactions
    where household_id = target_household_id and client_request_id = request_id;
  end if;

  return created_transaction_id;
end;
$$;

revoke all on function public.create_financial_transaction(
  uuid, uuid, text, numeric, text, uuid, text, timestamptz, uuid, uuid
) from public, anon;
grant execute on function public.create_financial_transaction(
  uuid, uuid, text, numeric, text, uuid, text, timestamptz, uuid, uuid
) to authenticated;

commit;
