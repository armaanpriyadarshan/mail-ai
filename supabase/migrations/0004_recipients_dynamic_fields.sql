-- Make recipient fields user-defined. Drop the typed first_name/last_name/
-- company/title columns and replace them with a single `data` jsonb that the
-- user's chosen field list writes into.
--
-- This throws away any existing recipient data, which is fine for pre-launch
-- greenfield state.

alter table public.recipients drop column if exists first_name;
alter table public.recipients drop column if exists last_name;
alter table public.recipients drop column if exists company;
alter table public.recipients drop column if exists title;

alter table public.recipients add column if not exists data jsonb not null default '{}'::jsonb;
