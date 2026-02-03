/**
 * Type-safe database operations and query builders
 * Uses actual database schema from Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// ============================================================================
// Database Types (from actual schema)
// ============================================================================

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Contribution = Database['public']['Tables']['contributions']['Row'];
export type WelfareCase = Database['public']['Tables']['welfare_cases']['Row'];
export type Announcement = Database['public']['Tables']['announcements']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type Meeting = Database['public']['Tables']['meetings']['Row'];
export type Member = Database['public']['Tables']['members']['Row'];

// ============================================================================
// Query Builders with Type Safety
// ============================================================================

/**
 * Fetch profiles with specific columns
 */
export async function fetchProfiles(
  filters?: {
    status?: Profile['status'];
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('profiles')
    .select('id, full_name, phone, email, status, membership_number, created_at, updated_at');

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Fetch single profile by ID
 */
export async function fetchProfileById(profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch contributions with filters
 */
export async function fetchContributions(
  filters?: {
    memberId?: string;
    status?: Contribution['status'];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('contributions')
    .select('id, member_id, amount, contribution_type, status, due_date, paid_at, created_at, updated_at');

  if (filters?.memberId) {
    query = query.eq('member_id', filters.memberId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Fetch welfare cases
 */
export async function fetchWelfareCases(
  filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('welfare_cases')
    .select('id, title, description, case_type, status, target_amount, collected_amount, created_at');

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Fetch announcements
 */
export async function fetchAnnouncements(
  filters?: {
    priority?: string;
    published?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('announcements')
    .select('id, title, content, priority, published, created_at, updated_at');

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  if (filters?.published !== undefined) {
    query = query.eq('published', filters.published);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Fetch audit logs
 */
export async function fetchAuditLogs(
  filters?: {
    performedBy?: string;
    actionType?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('audit_logs')
    .select('id, action_type, action_description, entity_type, entity_id, performed_by, performed_by_name, created_at');

  if (filters?.performedBy) query = query.eq('performed_by', filters.performedBy);
  if (filters?.actionType) query = query.eq('action_type', filters.actionType);
  if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);

  query = query.order('created_at', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Valid table names for count and batch operations
type CountableTable = 'profiles' | 'contributions' | 'announcements' | 'meetings' | 'welfare_cases';

/**
 * Count total records (for pagination)
 */
export async function countRecords(
  table: CountableTable,
  filters?: Record<string, unknown>
) {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true });

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value as string | number | boolean);
      }
    });
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

/**
 * Batch fetch related records
 */
export async function fetchBatch<T>(
  table: CountableTable,
  ids: string[],
  columns: string = '*'
): Promise<T[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .in('id', ids);

  if (error) throw error;
  return data as T[];
}
