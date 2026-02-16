-- Speed up public auth-signin identifier lookup paths.

create index if not exists profiles_email_lower_login_idx
  on public.profiles (lower(email))
  where email is not null;

create index if not exists profiles_phone_login_idx
  on public.profiles (phone)
  where phone is not null;

create index if not exists profiles_membership_upper_login_idx
  on public.profiles (upper(membership_number))
  where membership_number is not null;
