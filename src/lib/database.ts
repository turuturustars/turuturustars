/**
 * Type-safe database operations and query builders
 * Prevents N+1 queries, type casting issues, and improves performance
 */

import { supabase } from '@/integrations/supabase';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// ============================================================================
// Database Types (Strict Type Definitions)
// ============================================================================

export interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  idNumber: string;
  dateOfBirth: string;
  address: string;
  occupation: string;
  profilePhotoUrl?: string;
  status: 'active' | 'pending' | 'dormant' | 'suspended';
  joinedDate: string;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  description: string;
  paymentMethod: 'mpesa' | 'cash' | 'bank_transfer';
  reference: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WelfareCase {
  id: string;
  memberId: string;
  type: 'death' | 'illness' | 'accident' | 'other';
  description: string;
  amount?: number;
  status: 'active' | 'resolved' | 'closed';
  supportDetails?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetAudience: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  status: 'success' | 'failure';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees: string[];
  agenda: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Query Builders with Type Safety
// ============================================================================

/**
 * Fetch members with specific columns (avoid SELECT *)
 */
export async function fetchMembers(
  filters?: {
    status?: Member['status'];
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'firstName' | 'lastActive';
    ascending?: boolean;
  }
) {
  let query = supabase
    .from('members')
    .select(
      'id, email, firstName, lastName, phone, idNumber, status, joinedDate, lastActive, createdAt, updatedAt'
    ) as PostgrestFilterBuilder<any, any, any, any>;

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.sortBy) {
    query = query.order(filters.sortBy, { ascending: filters.ascending ?? false });
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Member[];
}

/**
 * Fetch single member with full details
 */
export async function fetchMemberById(memberId: string) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (error) throw error;
  return data as Member;
}

/**
 * Fetch contributions with member details (prevents N+1)
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
    .select('id, memberId, amount, description, paymentMethod, reference, date, status, createdAt, updatedAt') as PostgrestFilterBuilder<any, any, any, any>;

  if (filters?.memberId) {
    query = query.eq('memberId', filters.memberId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.dateFrom) {
    query = query.gte('date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('date', filters.dateTo);
  }

  query = query.order('date', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Contribution[];
}

/**
 * Fetch contributions with member info (single query, prevents N+1)
 */
export async function fetchContributionsWithMembers(
  filters?: {
    limit?: number;
    offset?: number;
  }
) {
  const { data, error } = await supabase
    .from('contributions')
    .select(
      `
        id,
        amount,
        paymentMethod,
        status,
        date,
        memberId,
        members:memberId (
          id,
          firstName,
          lastName,
          phone,
          email
        )
      `
    )
    .order('date', { ascending: false })
    .limit(filters?.limit ?? 20)
    .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 20) - 1);

  if (error) throw error;
  return data as any[];
}

/**
 * Fetch welfare cases
 */
export async function fetchWelfareCases(
  filters?: {
    status?: WelfareCase['status'];
    type?: WelfareCase['type'];
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('welfare_cases')
    .select('id, memberId, type, description, amount, status, createdAt, updatedAt') as PostgrestFilterBuilder<any, any, any, any>;

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  query = query.order('createdAt', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as WelfareCase[];
}

/**
 * Fetch announcements
 */
export async function fetchAnnouncements(
  filters?: {
    priority?: Announcement['priority'];
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('announcements')
    .select('id, title, content, priority, targetAudience, createdBy, createdAt, updatedAt') as PostgrestFilterBuilder<any, any, any, any>;

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  query = query.order('createdAt', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Announcement[];
}

/**
 * Fetch audit logs
 */
export async function fetchAuditLogs(
  filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    status?: AuditLog['status'];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('audit_logs')
    .select(
      'id, userId, action, resource, resourceId, status, createdAt'
    ) as PostgrestFilterBuilder<any, any, any, any>;

  if (filters?.userId) query = query.eq('userId', filters.userId);
  if (filters?.action) query = query.eq('action', filters.action);
  if (filters?.resource) query = query.eq('resource', filters.resource);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.dateFrom) query = query.gte('createdAt', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('createdAt', filters.dateTo);

  query = query.order('createdAt', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as AuditLog[];
}

/**
 * Count total records (for pagination)
 */
export async function countRecords(table: string, filters?: Record<string, any>) {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true }) as PostgrestFilterBuilder<any, any, any, any>;

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

/**
 * Batch fetch related records (prevents N+1 queries)
 */
export async function fetchBatch<T>(
  table: string,
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

// ============================================================================
// Mutation Helpers
// ============================================================================

/**
 * Insert with automatic audit log
 */
export async function insertWithAudit<T>(
  table: string,
  data: T,
  userId: string,
  action: string
) {
  try {
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert([data])
      .select()
      .single();

    if (error) throw error;

    // Log to audit trail
    await supabase.from('audit_logs').insert([
      {
        userId,
        action,
        resource: table,
        resourceId: (insertedData as any).id,
        status: 'success',
        changes: data,
      },
    ]);

    return insertedData;
  } catch (error) {
    // Log failure
    await supabase.from('audit_logs').insert([
      {
        userId,
        action,
        resource: table,
        resourceId: 'unknown',
        status: 'failure',
        errorMessage: (error as Error).message,
      },
    ]);

    throw error;
  }
}

/**
 * Update with automatic audit log
 */
export async function updateWithAudit<T extends { id: string }>(
  table: string,
  data: Partial<T>,
  userId: string,
  action: string
) {
  try {
    const { data: updatedData, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', data.id)
      .select()
      .single();

    if (error) throw error;

    // Log to audit trail
    await supabase.from('audit_logs').insert([
      {
        userId,
        action,
        resource: table,
        resourceId: data.id,
        status: 'success',
        changes: data,
      },
    ]);

    return updatedData;
  } catch (error) {
    // Log failure
    await supabase.from('audit_logs').insert([
      {
        userId,
        action,
        resource: table,
        resourceId: data.id,
        status: 'failure',
        errorMessage: (error as Error).message,
      },
    ]);

    throw error;
  }
}

/**
 * Delete with automatic audit log
 */
export async function deleteWithAudit(
  table: string,
  id: string,
  userId: string,
  action: string
) {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log to audit trail
    await supabase.from('audit_logs').insert([
      {
        userId,
        action,
        resource: table,
        resourceId: id,
        status: 'success',
      },
    ]);
  } catch (error) {
    // Log failure
    await supabase.from('audit_logs').insert([
      {
        userId,
        action,
        resource: table,
        resourceId: id,
        status: 'failure',
        errorMessage: (error as Error).message,
      },
    ]);

    throw error;
  }
}

// ============================================================================
// Real-time Subscriptions Helper
// ============================================================================

export function subscribeToTable(
  table: string,
  callback: (payload: any) => void,
  filter?: { column: string; value: string }
) {
  const subscription = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}
