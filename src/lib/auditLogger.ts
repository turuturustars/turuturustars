import { supabase } from '@/integrations/supabase/client';
import { Logger } from '@/utils/errorHandler';

type AuditPayload = {
  actionType: string;
  description: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Lightweight helper around the `log_audit_action` RPC.
 * Failures are swallowed (and logged) so they never block user flows.
 */
export async function logAuditAction(payload: AuditPayload) {
  try {
    await supabase.rpc('log_audit_action', {
      p_action_type: payload.actionType,
      p_action_description: payload.description,
      p_entity_type: payload.entityType,
      p_entity_id: payload.entityId ?? null,
      p_metadata: payload.metadata ?? {},
    });
  } catch (error) {
    Logger.warn('Audit log write failed', error, payload);
  }
}

export default logAuditAction;
