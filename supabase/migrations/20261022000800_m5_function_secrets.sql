-- M5-6b: Stripe TEST secrets for the Edge Functions when they cannot be set as function
-- secrets (no Supabase CLI token on the box). Values live encrypted in Supabase Vault; only the
-- service role (the Edge Functions) can read them, and only these two names. Function secrets
-- (Deno.env) still win when set.
create function public.function_secret(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from vault.decrypted_secrets ds
  where ds.name = p_name and p_name in ('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET')
  limit 1;
$$;
revoke all on function public.function_secret(text) from public, anon, authenticated;
grant execute on function public.function_secret(text) to service_role;
