export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          priority: string | null
          published: boolean | null
          published_at: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          published?: boolean | null
          published_at?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          published?: boolean | null
          published_at?: string | null
          title?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          performed_by: string
          performed_by_name: string | null
          performed_by_role: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          performed_by: string
          performed_by_name?: string | null
          performed_by_role?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          performed_by?: string
          performed_by_name?: string | null
          performed_by_role?: string | null
        }
        Relationships: []
      }
      contribution_tracking: {
        Row: {
          consecutive_missed: number | null
          id: string
          last_checked_at: string | null
          last_contribution_date: string | null
          member_id: string
        }
        Insert: {
          consecutive_missed?: number | null
          id?: string
          last_checked_at?: string | null
          last_contribution_date?: string | null
          member_id: string
        }
        Update: {
          consecutive_missed?: number | null
          id?: string
          last_checked_at?: string | null
          last_contribution_date?: string | null
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_tracking_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          amount: number
          contribution_type: string
          created_at: string | null
          due_date: string | null
          id: string
          member_id: string
          notes: string | null
          paid_at: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["contribution_status"] | null
          welfare_case_id: string | null
        }
        Insert: {
          amount: number
          contribution_type: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          member_id: string
          notes?: string | null
          paid_at?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["contribution_status"] | null
          welfare_case_id?: string | null
        }
        Update: {
          amount?: number
          contribution_type?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          paid_at?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["contribution_status"] | null
          welfare_case_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_welfare_case_id_fkey"
            columns: ["welfare_case_id"]
            isOneToOne: false
            referencedRelation: "welfare_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_records: {
        Row: {
          created_at: string | null
          description: string
          fine_amount: number | null
          fine_paid: boolean | null
          id: string
          incident_date: string
          incident_type: string
          member_id: string
          paid_at: string | null
          recorded_by: string
          resolution_notes: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          fine_amount?: number | null
          fine_paid?: boolean | null
          id?: string
          incident_date: string
          incident_type: string
          member_id: string
          paid_at?: string | null
          recorded_by: string
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          fine_amount?: number | null
          fine_paid?: boolean | null
          id?: string
          incident_date?: string
          incident_type?: string
          member_id?: string
          paid_at?: string | null
          recorded_by?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          cloudinary_public_id: string
          cloudinary_url: string
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_size: number | null
          id: string
          is_public: boolean | null
          mime_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          cloudinary_public_id: string
          cloudinary_url: string
          created_at?: string
          description?: string | null
          document_type: string
          file_name: string
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          cloudinary_public_id?: string
          cloudinary_url?: string
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      meeting_attendance: {
        Row: {
          apology_reason: string | null
          apology_sent: boolean | null
          attended: boolean | null
          id: string
          marked_at: string | null
          marked_by: string | null
          meeting_id: string
          member_id: string
        }
        Insert: {
          apology_reason?: string | null
          apology_sent?: boolean | null
          attended?: boolean | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          meeting_id: string
          member_id: string
        }
        Update: {
          apology_reason?: string | null
          apology_sent?: boolean | null
          attended?: boolean | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          meeting_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          action_items: Json | null
          agenda: string | null
          approved_at: string | null
          approved_by: string | null
          attendees: string[] | null
          created_at: string
          document_id: string | null
          id: string
          meeting_date: string
          meeting_type: string
          minutes_content: string | null
          recorded_by: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          agenda?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendees?: string[] | null
          created_at?: string
          document_id?: string | null
          id?: string
          meeting_date: string
          meeting_type: string
          minutes_content?: string | null
          recorded_by: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          agenda?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendees?: string[] | null
          created_at?: string
          document_id?: string | null
          id?: string
          meeting_date?: string
          meeting_type?: string
          minutes_content?: string | null
          recorded_by?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string | null
          created_by: string
          id: string
          meeting_type: string
          scheduled_date: string
          status: string | null
          title: string
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          agenda?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          meeting_type: string
          scheduled_date: string
          status?: string | null
          title: string
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          agenda?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          meeting_type?: string
          scheduled_date?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          location: string
          message: string | null
          occupation: string | null
          phone: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          location: string
          message?: string | null
          occupation?: string | null
          phone: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          location?: string
          message?: string | null
          occupation?: string | null
          phone?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      mpesa_standing_orders: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          end_date: string | null
          frequency: string
          id: string
          member_id: string
          next_debit_date: string | null
          phone_number: string
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          end_date?: string | null
          frequency: string
          id?: string
          member_id: string
          next_debit_date?: string | null
          phone_number: string
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          end_date?: string | null
          frequency?: string
          id?: string
          member_id?: string
          next_debit_date?: string | null
          phone_number?: string
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_standing_orders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_transactions: {
        Row: {
          amount: number
          checkout_request_id: string | null
          contribution_id: string | null
          created_at: string
          id: string
          initiated_by: string
          member_id: string | null
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          phone_number: string
          qr_code_data: string | null
          result_code: number | null
          result_desc: string | null
          status: string | null
          transaction_date: string | null
          transaction_type: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          contribution_id?: string | null
          created_at?: string
          id?: string
          initiated_by: string
          member_id?: string | null
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number: string
          qr_code_data?: string | null
          result_code?: number | null
          result_desc?: string | null
          status?: string | null
          transaction_date?: string | null
          transaction_type: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          contribution_id?: string | null
          created_at?: string
          id?: string
          initiated_by?: string
          member_id?: string | null
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number?: string
          qr_code_data?: string | null
          result_code?: number | null
          result_desc?: string | null
          status?: string | null
          transaction_date?: string | null
          transaction_type?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_transactions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mpesa_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          sent_via: string[] | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          sent_via?: string[] | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          sent_via?: string[] | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      private_conversations: {
        Row: {
          created_at: string
          id: string
          participant_one: string
          participant_two: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_one: string
          participant_two: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_one?: string
          participant_two?: string
          updated_at?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "private_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          consecutive_absences: number | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          is_student: boolean | null
          joined_at: string | null
          membership_number: string | null
          phone: string
          photo_url: string | null
          registration_fee_paid: boolean | null
          status: Database["public"]["Enums"]["member_status"] | null
          updated_at: string | null
        }
        Insert: {
          consecutive_absences?: number | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          id_number?: string | null
          is_student?: boolean | null
          joined_at?: string | null
          membership_number?: string | null
          phone: string
          photo_url?: string | null
          registration_fee_paid?: boolean | null
          status?: Database["public"]["Enums"]["member_status"] | null
          updated_at?: string | null
        }
        Update: {
          consecutive_absences?: number | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          is_student?: boolean | null
          joined_at?: string | null
          membership_number?: string | null
          phone?: string
          photo_url?: string | null
          registration_fee_paid?: boolean | null
          status?: Database["public"]["Enums"]["member_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_handovers: {
        Row: {
          acting_user_id: string
          created_at: string | null
          created_by: string
          end_date: string | null
          id: string
          original_user_id: string
          reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          start_date: string
          status: string | null
        }
        Insert: {
          acting_user_id: string
          created_at?: string | null
          created_by: string
          end_date?: string | null
          id?: string
          original_user_id: string
          reason?: string | null
          role: Database["public"]["Enums"]["app_role"]
          start_date: string
          status?: string | null
        }
        Update: {
          acting_user_id?: string
          created_at?: string | null
          created_by?: string
          end_date?: string | null
          id?: string
          original_user_id?: string
          reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          start_date?: string
          status?: string | null
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          is_typing: boolean
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          is_typing?: boolean
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          is_typing?: boolean
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          last_seen: string
          status: string
          user_id: string
        }
        Insert: {
          last_seen?: string
          status?: string
          user_id: string
        }
        Update: {
          last_seen?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          member_id: string
          motion_id: string
          vote: string
          voted_at: string | null
        }
        Insert: {
          id?: string
          member_id: string
          motion_id: string
          vote: string
          voted_at?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          motion_id?: string
          vote?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_motion_id_fkey"
            columns: ["motion_id"]
            isOneToOne: false
            referencedRelation: "voting_motions"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_motions: {
        Row: {
          closed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          meeting_id: string | null
          motion_type: string | null
          opened_at: string | null
          status: string | null
          tie_breaker_by: string | null
          tie_breaker_vote: string | null
          title: string
          votes_abstain: number | null
          votes_against: number | null
          votes_for: number | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          meeting_id?: string | null
          motion_type?: string | null
          opened_at?: string | null
          status?: string | null
          tie_breaker_by?: string | null
          tie_breaker_vote?: string | null
          title: string
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          meeting_id?: string | null
          motion_type?: string | null
          opened_at?: string | null
          status?: string | null
          tie_breaker_by?: string | null
          tie_breaker_vote?: string | null
          title?: string
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "voting_motions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      welfare_cases: {
        Row: {
          beneficiary_id: string | null
          case_type: string
          closed_at: string | null
          collected_amount: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          status: string | null
          target_amount: number | null
          title: string
        }
        Insert: {
          beneficiary_id?: string | null
          case_type: string
          closed_at?: string | null
          collected_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string | null
          target_amount?: number | null
          title: string
        }
        Update: {
          beneficiary_id?: string | null
          case_type?: string
          closed_at?: string | null
          collected_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string | null
          target_amount?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "welfare_cases_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_membership_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_management_committee: { Args: { _user_id: string }; Returns: boolean }
      is_official: { Args: { _user_id: string }; Returns: boolean }
      log_audit_action: {
        Args: {
          p_action_description: string
          p_action_type: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "treasurer"
        | "secretary"
        | "chairperson"
        | "coordinator"
        | "member"
        | "vice_chairman"
        | "vice_secretary"
        | "organizing_secretary"
        | "committee_member"
        | "patron"
      contribution_status: "paid" | "pending" | "missed"
      member_status: "active" | "dormant" | "pending" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "treasurer",
        "secretary",
        "chairperson",
        "coordinator",
        "member",
        "vice_chairman",
        "vice_secretary",
        "organizing_secretary",
        "committee_member",
        "patron",
      ],
      contribution_status: ["paid", "pending", "missed"],
      member_status: ["active", "dormant", "pending", "suspended"],
    },
  },
} as const
