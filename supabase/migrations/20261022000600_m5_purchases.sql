-- M5-8 / M5-6e: server-authoritative purchases. Only the stripe-webhook Edge Function (service
-- role, bypasses RLS) writes purchases_sandbox; players can read their own rows (restore) but
-- can no longer insert, so a client cannot grant itself paid items.
alter table public.purchases_sandbox
  add column session_id text unique check (char_length(session_id) between 1 and 255),
  add column payment_intent text check (char_length(payment_intent) <= 255),
  add column status text not null default 'paid' check (status in ('paid', 'refunded')),
  add column amount integer check (amount >= 0),
  add column currency text check (currency in ('usd', 'inr')),
  add column grants jsonb not null default '{}'::jsonb check (jsonb_typeof(grants) = 'object'),
  add column refunded_at timestamptz;

create index purchases_sandbox_payment_intent_idx on public.purchases_sandbox (payment_intent);

drop policy purchases_insert on public.purchases_sandbox;
revoke insert, update on public.purchases_sandbox from authenticated;
