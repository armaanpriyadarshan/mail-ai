-- Signatures are out of scope for v1 — dropping the column instead of leaving
-- a dead field on the profile.
alter table public.profiles drop column if exists default_signature;
