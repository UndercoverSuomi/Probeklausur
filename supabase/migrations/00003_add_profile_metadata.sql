-- Add metadata column to profiles for user preferences (default model, etc.)
alter table profiles add column if not exists metadata jsonb default '{}';

-- Update handle_new_user to also capture display_name from Google OAuth
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'name'
    )
  );
  return new;
end;
$$;
