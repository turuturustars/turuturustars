import { supabase } from '@/integrations/supabase/client';

/**
 * waitForProfileByEmail - poll `profiles` table until a row for `email` exists
 * @param email - email to look up
 * @param attempts - number of attempts
 * @param initialDelayMs - base delay
 */
export async function waitForProfileByEmail(
  email: string,
  attempts = 6,
  initialDelayMs = 400,
  options?: { onAttempt?: (attempt: number, delayMs: number) => void; signal?: AbortSignal }
) {
  if (!email) return null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (options?.signal?.aborted) {

      console.debug('waitForProfileByEmail aborted');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (!error && data) {

        console.debug(`waitForProfileByEmail: found profile for ${email} on attempt ${attempt + 1}`);
        return data as Record<string, unknown>;
      }

      if (error) {

        console.warn('waitForProfileByEmail supabase error', error);
      }
    } catch (e) {

      console.warn('waitForProfileByEmail attempt error', e);
    }

    const base = initialDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * initialDelayMs);
    const delay = base + jitter;

    try {
      options?.onAttempt?.(attempt + 1, delay);
    } catch (e) {
      console.debug('waitForProfileByEmail onAttempt callback failed', e);
    }


    await new Promise((resolve) => setTimeout(resolve, delay));
  }


  console.warn(`waitForProfileByEmail: profile for ${email} not found after ${attempts} attempts`);
  return null;
}

export default waitForProfileByEmail;
