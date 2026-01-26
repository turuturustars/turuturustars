-- Phase 6: Real-time Subscriptions Enhancement
-- Enable optimized real-time tracking and change capture
-- File: supabase/migrations/20260124_phase6_realtime_enhancements.sql

-- ============================================================================
-- Ensure RLS is enabled for real-time security
-- ============================================================================

-- Enable RLS on all real-time enabled tables
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_motions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE welfare_cases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Add change tracking columns for incremental updates
-- ============================================================================

-- Contributions: Track last update for efficient diff detection
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
CREATE OR REPLACE FUNCTION update_contributions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contributions_update_timestamp ON contributions;
CREATE TRIGGER contributions_update_timestamp
  BEFORE UPDATE ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_contributions_timestamp();

-- Announcements: Track versions for offline conflict resolution
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION update_announcements_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS announcements_version_update ON announcements;
CREATE TRIGGER announcements_version_update
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_version();

-- Notifications: Track read status change time
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION update_notifications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  IF NEW.read != OLD.read AND NEW.read = true THEN
    NEW.read_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notifications_update_timestamp ON notifications;
CREATE TRIGGER notifications_update_timestamp
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_timestamp();

-- Messages: Track delivery state
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Private Messages: Track read status
ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Voting Motions: Track status changes
ALTER TABLE voting_motions ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- Create indexes for efficient real-time queries
-- ============================================================================

-- Optimize timestamp-based queries for incremental updates
CREATE INDEX IF NOT EXISTS idx_contributions_updated_at 
  ON contributions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_updated_at 
  ON announcements(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_updated_at 
  ON notifications(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_read_updated 
  ON notifications(read, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
  ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_private_messages_read_at
  ON private_messages(read_at DESC);

CREATE INDEX IF NOT EXISTS idx_voting_motions_status_updated 
  ON voting_motions(status, status_updated_at DESC);

-- ============================================================================
-- Create change log table for audit trail and conflict resolution
-- ============================================================================

CREATE TABLE IF NOT EXISTS realtime_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[], -- Array of field names that changed
  client_id TEXT, -- Client/user making the change
  conflict_resolved BOOLEAN DEFAULT FALSE,
  conflict_strategy TEXT, -- 'remote-wins', 'local-wins', 'merge'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_realtime_change_log_table 
  ON realtime_change_log(table_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_realtime_change_log_record 
  ON realtime_change_log(table_name, record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_realtime_change_log_conflicts 
  ON realtime_change_log(conflict_resolved) WHERE conflict_resolved = FALSE;

-- Function to log changes
CREATE OR REPLACE FUNCTION log_realtime_change()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[];
BEGIN
  -- Determine which fields changed
  IF TG_OP = 'INSERT' THEN
    changed_fields := array_agg(key) FROM jsonb_each_text(row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT array_agg(DISTINCT key) INTO changed_fields
    FROM (
      SELECT jsonb_object_keys(row_to_json(NEW)) AS key
      UNION
      SELECT jsonb_object_keys(row_to_json(OLD)) AS key
    ) t
    WHERE row_to_json(NEW)->>key IS DISTINCT FROM row_to_json(OLD)->>key;
  END IF;

  INSERT INTO realtime_change_log (
    table_name,
    record_id,
    change_type,
    old_values,
    new_values,
    changed_fields,
    client_id
  ) VALUES (
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    changed_fields,
    current_user_id()
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID (implement based on your auth setup)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.uid()::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Attach change logging to key tables
-- ============================================================================

DROP TRIGGER IF EXISTS log_contributions_changes ON contributions;
CREATE TRIGGER log_contributions_changes
  AFTER INSERT OR UPDATE OR DELETE ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION log_realtime_change();

DROP TRIGGER IF EXISTS log_announcements_changes ON announcements;
CREATE TRIGGER log_announcements_changes
  AFTER INSERT OR UPDATE OR DELETE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION log_realtime_change();

DROP TRIGGER IF EXISTS log_notifications_changes ON notifications;
CREATE TRIGGER log_notifications_changes
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION log_realtime_change();

DROP TRIGGER IF EXISTS log_messages_changes ON messages;
CREATE TRIGGER log_messages_changes
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION log_realtime_change();

-- ============================================================================
-- Create view for efficient querying of recent changes
-- ============================================================================

CREATE OR REPLACE VIEW recent_changes AS
SELECT 
  table_name,
  record_id,
  change_type,
  changed_fields,
  created_at,
  client_id
FROM realtime_change_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- ============================================================================
-- RLS Policies for real-time enabled tables (example for notifications)
-- ============================================================================

-- Enable users to see their own notifications in real-time
DROP POLICY IF EXISTS "Users can see own notifications" ON notifications;
CREATE POLICY "Users can see own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Enable users to update their own notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- Realtime grants (ensure realtime role has access)
-- ============================================================================

GRANT EXECUTE ON FUNCTION log_realtime_change TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_id TO authenticated;
GRANT SELECT ON TABLE realtime_change_log TO authenticated;
-- GRANT SELECT ON VIEW recent_changes TO authenticated;
