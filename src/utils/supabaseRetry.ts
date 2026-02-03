import { supabase } from '@/integrations/supabase/client';

type ValidTable = 'voting_motions_with_vote_breakdown' | 'voting_motions_with_vote_count' | string;

/**
 * retryUpsert - attempt to upsert rows with retries and exponential backoff
 * @param table - table name
 * @param row - object or array to upsert
 * @param options - options passed to supabase.from(table).upsert
 * @param attempts - number of attempts (default 3)
 * @param initialDelayMs - initial backoff in ms (default 300)
 */
export async function retryUpsert(
  table: ValidTable,
  row: any,
  options: Record<string, unknown> = {},
  attempts = 3,
  initialDelayMs = 300,
  meta?: { requestId?: string }
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // structured debug: include requestId when available
      if (meta?.requestId) console.debug(`retryUpsert requestId=${meta.requestId} attempt=${attempt} table=${table}`);
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
      if (meta?.requestId) console.warn(`retryUpsert requestId=${meta.requestId} attempt=${attempt} error=${String(err)}`);
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
