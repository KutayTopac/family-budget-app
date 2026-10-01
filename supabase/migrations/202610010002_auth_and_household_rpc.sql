begin;

create unique index household_members_one_active_household_idx
on public.household_members(user_id)
where status = 'active';

create or replace function public.create_household(
  household_name text,
  household_currency text default 'TRY'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_household_id uuid;
  normalized_currency text := upper(trim(household_currency));
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(household_name)) not between 2 and 80 then
    raise exception 'Household name must be between 2 and 80 characters';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency code';
  end if;
  if exists (
    select 1 from public.household_members
    where user_id = current_user_id and status = 'active'
  ) then
    raise exception 'User already belongs to an active household';
  end if;

  insert into public.households (name, base_currency, created_by)
  values (trim(household_name), normalized_currency, current_user_id)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, current_user_id, 'owner');

  insert into public.categories (household_id, name, type, icon, color) values
    (new_household_id, 'Maaş', 'income', 'payments', '#16A34A'),
    (new_household_id, 'Diğer Gelir', 'income', 'add_chart', '#22C55E'),
    (new_household_id, 'Market', 'expense', 'shopping_cart', '#F59E0B'),
    (new_household_id, 'Faturalar', 'expense', 'receipt_long', '#3B82F6'),
    (new_household_id, 'Ulaşım', 'expense', 'directions_car', '#8B5CF6'),
    (new_household_id, 'Sağlık', 'expense', 'health_and_safety', '#EF4444'),
    (new_household_id, 'Diğer Gider', 'expense', 'more_horiz', '#64748B');

  insert into public.accounts (household_id, owner_member_id, name, type, currency)
  values (new_household_id, null, 'Ortak Nakit', 'cash', normalized_currency);

  return new_household_id;
end;
$$;

create or replace function public.create_household_invitation(
  target_household_id uuid,
  valid_for_minutes integer default 1440
) returns table (invitation_code text, invitation_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  raw_code text;
  normalized_code text;
  expiry timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not private.is_household_owner(target_household_id) then
    raise exception 'Only an active household owner can create invitations';
  end if;
  if valid_for_minutes not between 5 and 10080 then
    raise exception 'Invitation validity must be between 5 and 10080 minutes';
  end if;

  normalized_code := upper(encode(gen_random_bytes(8), 'hex'));
  raw_code := substr(normalized_code, 1, 4) || '-' || substr(normalized_code, 5, 4)
    || '-' || substr(normalized_code, 9, 4) || '-' || substr(normalized_code, 13, 4);
  expiry := now() + make_interval(mins => valid_for_minutes);

  update public.household_invitations
  set revoked_at = now()
  where household_id = target_household_id
    and accepted_at is null and revoked_at is null and expires_at > now();

  insert into public.household_invitations (
    household_id, code_hash, created_by, expires_at
  ) values (
    target_household_id,
    encode(digest(normalized_code, 'sha256'), 'hex'),
    current_user_id,
    expiry
  );

  return query select raw_code, expiry;
end;
$$;

create or replace function public.accept_household_invitation(
  invitation_code text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text;
  matched_invitation public.household_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if exists (
    select 1 from public.household_members
    where user_id = current_user_id and status = 'active'
  ) then
    raise exception 'User already belongs to an active household';
  end if;

  normalized_code := upper(regexp_replace(coalesce(invitation_code, ''), '[^0-9A-F]', '', 'g'));
  if char_length(normalized_code) <> 16 then
    raise exception 'Invitation code is invalid or expired';
  end if;

  select * into matched_invitation
  from public.household_invitations
  where code_hash = encode(digest(normalized_code, 'sha256'), 'hex')
    and accepted_at is null and revoked_at is null and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation code is invalid or expired';
  end if;

  insert into public.household_members (household_id, user_id, role, status)
  values (matched_invitation.household_id, current_user_id, 'member', 'active')
  on conflict (household_id, user_id)
  do update set status = 'active', joined_at = now();

  update public.household_invitations
  set accepted_by = current_user_id, accepted_at = now()
  where id = matched_invitation.id;

  return matched_invitation.household_id;
end;
$$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.create_household_invitation(uuid, integer) from public, anon;
revoke all on function public.accept_household_invitation(text) from public, anon;

grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_household_invitation(uuid, integer) to authenticated;
grant execute on function public.accept_household_invitation(text) to authenticated;

revoke insert, update, delete on public.household_invitations from authenticated;

commit;
