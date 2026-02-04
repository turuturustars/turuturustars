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
  row: Record<string, unknown> | Record<string, unknown>[],
  options: { onConflict?: string } = {},
  attempts = 3,
  initialDelayMs = 300,
  meta?: { requestId?: string }
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (meta?.requestId) {
        console.debug(`retryUpsert requestId=${meta.requestId} attempt=${attempt} table=${table}`);
      }
      
      // Use type assertion to bypass strict table typing
      const res = await (supabase.from(table as 'profiles') as any).upsert(row, options);
      
      if (!res.error) return res;
      
      const err = res.error;
      if (attempt === attempts) return res;
      
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      if (meta?.requestId) {
        console.warn(`retryUpsert requestId=${meta.requestId} attempt=${attempt} error=${String(err)}`);
      }
      if (attempt === attempts) {
        throw err;
      }
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export default retryUpsert;
