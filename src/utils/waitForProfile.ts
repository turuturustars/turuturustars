import { supabase } from '@/integrations/supabase/client';

/**
 * waitForProfile - poll the `profiles` table until a row for `userId` exists
 * Useful when a DB trigger or async process creates the profile after auth
 *
 * @param userId - the user's id to wait for
 * @param attempts - number of polling attempts (default 5)
 * @param initialDelayMs - delay before first retry in ms (default 500)
 * @returns the profile row if found, otherwise null
 */
export async function waitForProfile(userId: string, attempts = 5, initialDelayMs = 500) {
  if (!userId) return null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as Record<string, unknown>;
      }
    } catch (e) {
      // swallow and retry
      // eslint-disable-next-line no-console
      console.warn('waitForProfile attempt error', e);
    }

    // exponential backoff
    const delay = initialDelayMs * Math.pow(2, attempt);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return null;
}

export default waitForProfile;
