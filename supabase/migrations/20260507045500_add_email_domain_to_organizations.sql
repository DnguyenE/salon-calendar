-- supabase/migrations/20260507045500_add_email_domain_to_organizations.sql
--
-- Store an organization-level email domain used for staff email prefills.

alter table public.organizations
  add column if not exists email_domain text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_email_domain_format_chk'
  ) then
    alter table public.organizations
      add constraint organizations_email_domain_format_chk
      check (
        email_domain is null
        or (
          position('@' in email_domain) = 0
          and length(trim(email_domain)) > 0
          and email_domain = lower(email_domain)
        )
      );
  end if;
end $$;
