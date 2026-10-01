begin;
select plan(6);

select ok(
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any(array['profiles','households','household_members','household_invitations','categories','tags','accounts','transactions','transaction_entries','transaction_tags','budgets','savings_goals','instruments','investment_trades','market_prices','audit_events'])
      and not c.relrowsecurity
  ), 'All exposed application tables have RLS enabled'
);

select has_function(
  'public', 'create_household', array['text', 'text'],
  'Atomic household creation function exists'
);

select has_function(
  'public', 'create_household_invitation', array['uuid', 'integer'],
  'Server-side invitation generation function exists'
);

select has_function(
  'public', 'accept_household_invitation', array['text'],
  'Atomic invitation acceptance function exists'
);

select has_function(
  'public', 'create_financial_transaction',
  array['uuid', 'uuid', 'text', 'numeric', 'text', 'uuid', 'text', 'timestamp with time zone', 'uuid', 'uuid'],
  'Idempotent transaction creation function exists'
);

select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
      and table_name = any(array['profiles','households','household_members','transactions','accounts'])
  ), 'Anonymous role has no grants on private finance tables'
);

select * from finish();
rollback;
