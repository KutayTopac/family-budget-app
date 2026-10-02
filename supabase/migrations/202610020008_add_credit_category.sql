begin;

insert into public.categories (household_id, name, type, icon, color)
select id, 'Kredi', 'expense', 'credit_score', '#B7791F' from public.households
on conflict (household_id, type, name) do nothing;

create or replace function public.create_household(
  household_name text,
  household_currency text default 'TRY'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); new_household_id uuid; normalized_currency text := upper(trim(household_currency));
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(household_name)) not between 2 and 80 then raise exception 'Household name must be between 2 and 80 characters'; end if;
  if normalized_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid currency code'; end if;
  if exists (select 1 from public.household_members where user_id=current_user_id and status='active') then raise exception 'User already belongs to an active household'; end if;
  insert into public.households (name,base_currency,created_by) values(trim(household_name),normalized_currency,current_user_id) returning id into new_household_id;
  insert into public.household_members (household_id,user_id,role) values(new_household_id,current_user_id,'owner');
  insert into public.categories (household_id,name,type,icon,color) values
    (new_household_id,'Maaş','income','payments','#3D8067'),
    (new_household_id,'Diğer Gelir','income','add_chart','#5C9A7F'),
    (new_household_id,'Market','expense','shopping_cart','#D69E2E'),
    (new_household_id,'Faturalar','expense','receipt_long','#4C7C9F'),
    (new_household_id,'Ulaşım','expense','directions_car','#7B6CA8'),
    (new_household_id,'Sağlık','expense','health_and_safety','#C65D47'),
    (new_household_id,'Kira','expense','home','#2F6F59'),
    (new_household_id,'Eğlence','expense','celebration','#B85C83'),
    (new_household_id,'Kredi','expense','credit_score','#B7791F'),
    (new_household_id,'Diğer Gider','expense','more_horiz','#778079');
  insert into public.accounts (household_id,owner_member_id,name,type,currency) values(new_household_id,null,'Ortak Nakit','cash',normalized_currency);
  return new_household_id;
end; $$;

revoke all on function public.create_household(text,text) from public,anon;
grant execute on function public.create_household(text,text) to authenticated;
commit;
