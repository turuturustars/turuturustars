import { supabase } from '@/integrations/supabase/client';

/**
 * retryUpsert - attempt to upsert rows with retries and exponential backoff
 * @param table - table name
 * @param row - object or array to upsert
 * @param options - options passed to supabase.from(table).upsert
 * @param attempts - number of attempts (default 3)
 * @param initialDelayMs - initial backoff in ms (default 300)
 */
export async function retryUpsert(
  table: string,
  row: any,
  options: Record<string, unknown> = {},
  attempts = 3,
  initialDelayMs = 300
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await supabase.from(table).upsert(row, options);
      // supabase returns { data, error }
      // @ts-ignore
      if (!res.error) return res;
      // @ts-ignore
      const err = res.error;
      // If last attempt, return error
      if (attempt === attempts) return res;
      // otherwise wait and retry
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      if (attempt === attempts) {
        throw err;
      }
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export default retryUpsert;
