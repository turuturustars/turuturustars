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
export async function waitForProfile(
  userId: string,
  attempts = 6,
  initialDelayMs = 400,
  options?: {
    onAttempt?: (attempt: number, delayMs: number) => void;
    signal?: AbortSignal;
  }
) {
  if (!userId) return null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (options?.signal?.aborted) {

      console.debug('waitForProfile aborted');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {

        console.debug(`waitForProfile: found profile for ${userId} on attempt ${attempt + 1}`);
        return data as Record<string, unknown>;
      }

      if (error) {

        console.warn('waitForProfile supabase error', error);
      }
    } catch (e) {

      console.warn('waitForProfile attempt error', e);
    }

    // exponential backoff with jitter
    const base = initialDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * initialDelayMs);
    const delay = base + jitter;

    try {
      options?.onAttempt?.(attempt + 1, delay);
    } catch (e) {
      // swallow observer errors
    }


    await new Promise((resolve) => setTimeout(resolve, delay));
  }


  console.warn(`waitForProfile: profile for ${userId} not found after ${attempts} attempts`);
  return null;
}

export default waitForProfile;
