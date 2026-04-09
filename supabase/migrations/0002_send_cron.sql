-- Schedule the send-batch Edge Function to fire every minute.
-- Replace <project-ref> and the service-role key in the Vault before running this in prod.
-- The Vault entries are read at job execution time so secrets aren't inlined here.

-- Vault setup (run once, manually):
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-batch', 'send_batch_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');

select cron.schedule(
  'mail-ai-send-batch',
  '* * * * *', -- every minute; send-batch internally enforces per-user spacing & daily limits
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'send_batch_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
