type DenoServeHandler = (request: Request) => Response | Promise<Response>;

interface SupabaseEdgeError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface SupabaseEdgeResponse<T = unknown> {
  data: T | null;
  error: SupabaseEdgeError | null;
  count?: number | null;
  status?: number;
  statusText?: string;
}

interface SupabaseEdgeQuery<T = unknown> extends PromiseLike<SupabaseEdgeResponse<T>> {
  select(columns?: string, options?: Record<string, unknown>): SupabaseEdgeQuery<T>;
  insert(values: unknown, options?: Record<string, unknown>): SupabaseEdgeQuery<T>;
  update(values: Record<string, unknown>, options?: Record<string, unknown>): SupabaseEdgeQuery<T>;
  upsert(values: unknown, options?: Record<string, unknown>): SupabaseEdgeQuery<T>;
  delete(options?: Record<string, unknown>): SupabaseEdgeQuery<T>;
  eq(column: string, value: unknown): SupabaseEdgeQuery<T>;
  neq(column: string, value: unknown): SupabaseEdgeQuery<T>;
  in(column: string, values: readonly unknown[]): SupabaseEdgeQuery<T>;
  is(column: string, value: unknown): SupabaseEdgeQuery<T>;
  or(filters: string, options?: Record<string, unknown>): SupabaseEdgeQuery<T>;
  order(column: string, options?: Record<string, unknown>): SupabaseEdgeQuery<T>;
  limit(count: number, options?: Record<string, unknown>): SupabaseEdgeQuery<T>;
  range(from: number, to: number, options?: Record<string, unknown>): SupabaseEdgeQuery<T>;
  single(): Promise<SupabaseEdgeResponse<T>>;
  maybeSingle(): Promise<SupabaseEdgeResponse<T>>;
}

interface SupabaseEdgeClient {
  auth: {
    getUser(token?: string): Promise<SupabaseEdgeResponse>;
    admin: {
      createUser(attributes: Record<string, unknown>): Promise<SupabaseEdgeResponse>;
      deleteUser(userId: string): Promise<SupabaseEdgeResponse>;
      getUserById(userId: string): Promise<SupabaseEdgeResponse>;
      listUsers(params?: Record<string, unknown>): Promise<SupabaseEdgeResponse>;
      updateUserById(userId: string, attributes: Record<string, unknown>): Promise<SupabaseEdgeResponse>;
    };
  };
  from(table: string): SupabaseEdgeQuery;
  rpc(functionName: string, args?: Record<string, unknown>): SupabaseEdgeQuery;
}

declare global {
  namespace Deno {
    namespace env {
      function get(key: string): string | undefined;
    }

    function serve(handler: DenoServeHandler): void;
  }
}

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: DenoServeHandler): void;
}

declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: DenoServeHandler): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.3" {
  export function createClient(url: string, key: string, options?: unknown): SupabaseEdgeClient;
}

declare module "https://esm.sh/@supabase/supabase-js@2.91.1" {
  export function createClient(url: string, key: string, options?: unknown): SupabaseEdgeClient;
}

export {};
