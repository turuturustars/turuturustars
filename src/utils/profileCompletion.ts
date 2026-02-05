type BasicProfile = {
  full_name?: string | null;
  phone?: string | null;
  id_number?: string | null;
};

export function isProfileComplete(profile?: BasicProfile | null): boolean {
  if (!profile) return false;
  return Boolean(profile.full_name && profile.phone && profile.id_number);
}
