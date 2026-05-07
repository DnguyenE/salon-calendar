-- supabase/migrations/20260506_add_password_hash_to_profiles.sql
--
-- Add password_hash column to profiles for admin authentication

alter table public.profiles
  add column if not exists password_hash text;
