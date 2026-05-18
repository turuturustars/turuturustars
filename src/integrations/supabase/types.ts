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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          bot_scope: string
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          metadata: Json
          title: string
          updated_at: string
        }
        Insert: {
          bot_scope?: string
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          title: string
          updated_at?: string
        }
        Update: {
          bot_scope?: string
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          updated_at: string | null
          version: number | null
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
          updated_at?: string | null
          version?: number | null
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
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      approvals: {
        Row: {
          approver: string
          created_at: string
          decision: string
          id: string
          notes: string | null
          payment_id: string
        }
        Insert: {
          approver: string
          created_at?: string
          decision: string
          id?: string
          notes?: string | null
          payment_id: string
        }
        Update: {
          approver?: string
          created_at?: string
          decision?: string
          id?: string
          notes?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
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
      auth_trigger_errors: {
        Row: {
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          operation: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          operation?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          operation?: string | null
          user_id?: string | null
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          donor_email: string | null
          donor_name: string | null
          donor_phone: string | null
          id: string
          notes: string | null
          paid_at: string | null
          reference_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenditures: {
        Row: {
          amount: number
          approved_at: string | null
          category: string
          created_at: string
          description: string
          id: string
          initiated_by: string
          payment_method: string
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          initiated_by: string
          payment_method?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          initiated_by?: string
          payment_method?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_approvals: {
        Row: {
          approver_id: string | null
          approver_role: string | null
          created_at: string
          decided_at: string | null
          decision: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          required_role: string
        }
        Insert: {
          approver_id?: string | null
          approver_role?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          required_role: string
        }
        Update: {
          approver_id?: string | null
          approver_role?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          required_role?: string
        }
        Relationships: []
      }
      job_scrape_settings: {
        Row: {
          created_at: string
          id: number
          job_max_priority: number
          max_per_source: number
          request_delay_ms: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          job_max_priority?: number
          max_per_source?: number
          request_delay_ms?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          job_max_priority?: number
          max_per_source?: number
          request_delay_ms?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      job_scrape_sources: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          priority: number
          updated_at: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          priority?: number
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          priority?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          apply_url: string | null
          approved_at: string | null
          approved_by: string | null
          county: string
          created_at: string
          deadline: string | null
          excerpt: string | null
          external_id: string | null
          id: string
          is_government: boolean
          is_priority_location: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          location: string
          organization: string
          posted_at: string
          rejected_reason: string | null
          source_name: string
          source_url: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          apply_url?: string | null
          approved_at?: string | null
          approved_by?: string | null
          county: string
          created_at?: string
          deadline?: string | null
          excerpt?: string | null
          external_id?: string | null
          id?: string
          is_government?: boolean
          is_priority_location?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location: string
          organization: string
          posted_at?: string
          rejected_reason?: string | null
          source_name: string
          source_url: string
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          apply_url?: string | null
          approved_at?: string | null
          approved_by?: string | null
          county?: string
          created_at?: string
          deadline?: string | null
          excerpt?: string | null
          external_id?: string | null
          id?: string
          is_government?: boolean
          is_priority_location?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string
          organization?: string
          posted_at?: string
          rejected_reason?: string | null
          source_name?: string
          source_url?: string
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kitties: {
        Row: {
          balance: number
          beneficiary_details: string | null
          beneficiary_member_id: string | null
          beneficiary_name: string | null
          beneficiary_phone: string | null
          beneficiary_relationship: string | null
          category: Database["public"]["Enums"]["kitty_category"]
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          id: string
          parent_kitty_id: string | null
          round_number: number
          status: Database["public"]["Enums"]["kitty_status"]
          target_amount: number
          title: string
          total_contributed: number
          total_disbursed: number
          updated_at: string
        }
        Insert: {
          balance?: number
          beneficiary_details?: string | null
          beneficiary_member_id?: string | null
          beneficiary_name?: string | null
          beneficiary_phone?: string | null
          beneficiary_relationship?: string | null
          category?: Database["public"]["Enums"]["kitty_category"]
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          id?: string
          parent_kitty_id?: string | null
          round_number?: number
          status?: Database["public"]["Enums"]["kitty_status"]
          target_amount: number
          title: string
          total_contributed?: number
          total_disbursed?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          beneficiary_details?: string | null
          beneficiary_member_id?: string | null
          beneficiary_name?: string | null
          beneficiary_phone?: string | null
          beneficiary_relationship?: string | null
          category?: Database["public"]["Enums"]["kitty_category"]
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          id?: string
          parent_kitty_id?: string | null
          round_number?: number
          status?: Database["public"]["Enums"]["kitty_status"]
          target_amount?: number
          title?: string
          total_contributed?: number
          total_disbursed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitties_parent_kitty_id_fkey"
            columns: ["parent_kitty_id"]
            isOneToOne: false
            referencedRelation: "kitties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitties_parent_kitty_id_fkey"
            columns: ["parent_kitty_id"]
            isOneToOne: false
            referencedRelation: "kitty_roots_v"
            referencedColumns: ["kitty_id"]
          },
        ]
      }
      kitty_beneficiaries: {
        Row: {
          allocated_amount: number
          created_at: string
          created_by: string
          details: string | null
          disbursed_amount: number
          id: string
          kitty_id: string
          member_id: string | null
          name: string
          phone: string | null
          relationship: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allocated_amount?: number
          created_at?: string
          created_by: string
          details?: string | null
          disbursed_amount?: number
          id?: string
          kitty_id: string
          member_id?: string | null
          name: string
          phone?: string | null
          relationship?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string
          created_by?: string
          details?: string | null
          disbursed_amount?: number
          id?: string
          kitty_id?: string
          member_id?: string | null
          name?: string
          phone?: string | null
          relationship?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitty_beneficiaries_kitty_id_fkey"
            columns: ["kitty_id"]
            isOneToOne: false
            referencedRelation: "kitties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitty_beneficiaries_kitty_id_fkey"
            columns: ["kitty_id"]
            isOneToOne: false
            referencedRelation: "kitty_roots_v"
            referencedColumns: ["kitty_id"]
          },
          {
            foreignKeyName: "kitty_beneficiaries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kitty_contributions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kitty_id: string
          member_id: string
          mpesa_transaction_id: string | null
          notes: string | null
          reference: string | null
          source: Database["public"]["Enums"]["kitty_source"]
          status: string
          wallet_transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kitty_id: string
          member_id: string
          mpesa_transaction_id?: string | null
          notes?: string | null
          reference?: string | null
          source: Database["public"]["Enums"]["kitty_source"]
          status?: string
          wallet_transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kitty_id?: string
          member_id?: string
          mpesa_transaction_id?: string | null
          notes?: string | null
          reference?: string | null
          source?: Database["public"]["Enums"]["kitty_source"]
          status?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitty_contributions_kitty_id_fkey"
            columns: ["kitty_id"]
            isOneToOne: false
            referencedRelation: "kitties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitty_contributions_kitty_id_fkey"
            columns: ["kitty_id"]
            isOneToOne: false
            referencedRelation: "kitty_roots_v"
            referencedColumns: ["kitty_id"]
          },
        ]
      }
      kitty_disbursements: {
        Row: {
          amount: number
          created_at: string
          id: string
          kitty_id: string
          purpose: string
          recipient: string | null
          recorded_by: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kitty_id: string
          purpose: string
          recipient?: string | null
          recorded_by: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kitty_id?: string
          purpose?: string
          recipient?: string | null
          recorded_by?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitty_disbursements_kitty_id_fkey"
            columns: ["kitty_id"]
            isOneToOne: false
            referencedRelation: "kitties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitty_disbursements_kitty_id_fkey"
            columns: ["kitty_id"]
            isOneToOne: false
            referencedRelation: "kitty_roots_v"
            referencedColumns: ["kitty_id"]
          },
        ]
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
      member_wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          member_id: string
          metadata: Json
          reference_number: string | null
          source: string
          status: string
          transaction_type: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          member_id: string
          metadata?: Json
          reference_number?: string | null
          source?: string
          status?: string
          transaction_type: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string
          metadata?: Json
          reference_number?: string | null
          source?: string
          status?: string
          transaction_type?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_wallet_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "member_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      member_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          member_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          member_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_wallets_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      membership_fees: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          fee_type: string
          id: string
          member_id: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          due_date: string
          fee_type?: string
          id?: string
          member_id: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          fee_type?: string
          id?: string
          member_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_fees_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          delivered_at: string | null
          id: string
          room_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          room_id?: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          room_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mpesa_callback_audit: {
        Row: {
          checkout_request_id: string | null
          created_at: string
          event_type: string
          id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          payload: Json
          result_code: number | null
          signature_valid: boolean
        }
        Insert: {
          checkout_request_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          payload?: Json
          result_code?: number | null
          signature_valid?: boolean
        }
        Update: {
          checkout_request_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          payload?: Json
          result_code?: number | null
          signature_valid?: boolean
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
          kitty_id: string | null
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
          kitty_id?: string | null
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
          kitty_id?: string | null
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
            foreignKeyName: "mpesa_transactions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "membership_fee_history_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mpesa_transactions_kitty_id_fkey"
            columns: ["kitty_id"]
            isOneToOne: false
            referencedRelation: "kitties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mpesa_transactions_kitty_id_fkey"
            columns: ["kitty_id"]
            isOneToOne: false
            referencedRelation: "kitty_roots_v"
            referencedColumns: ["kitty_id"]
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
      notification_preferences: {
        Row: {
          created_at: string
          email: boolean
          enable_announcements: boolean
          enable_approvals: boolean
          enable_contributions: boolean
          enable_meetings: boolean
          enable_messages: boolean
          enable_sms_announcements: boolean
          enable_sms_transactions: boolean
          enable_sms_voting: boolean
          enable_sms_welcome: boolean
          enable_sms_welfare: boolean
          enable_transactions: boolean
          enable_welfare: boolean
          in_app: boolean
          push: boolean
          sms_announcement_priority: string
          sms_enabled: boolean
          sound: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: boolean
          enable_announcements?: boolean
          enable_approvals?: boolean
          enable_contributions?: boolean
          enable_meetings?: boolean
          enable_messages?: boolean
          enable_sms_announcements?: boolean
          enable_sms_transactions?: boolean
          enable_sms_voting?: boolean
          enable_sms_welcome?: boolean
          enable_sms_welfare?: boolean
          enable_transactions?: boolean
          enable_welfare?: boolean
          in_app?: boolean
          push?: boolean
          sms_announcement_priority?: string
          sms_enabled?: boolean
          sound?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: boolean
          enable_announcements?: boolean
          enable_approvals?: boolean
          enable_contributions?: boolean
          enable_meetings?: boolean
          enable_messages?: boolean
          enable_sms_announcements?: boolean
          enable_sms_transactions?: boolean
          enable_sms_voting?: boolean
          enable_sms_welcome?: boolean
          enable_sms_welfare?: boolean
          enable_transactions?: boolean
          enable_welfare?: boolean
          in_app?: boolean
          push?: boolean
          sms_announcement_priority?: string
          sms_enabled?: boolean
          sound?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          sent_via: string[] | null
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
          whatsapp_error: string | null
          whatsapp_message_id: string | null
          whatsapp_sent_at: string | null
          whatsapp_status: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          sent_via?: string[] | null
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
          whatsapp_error?: string | null
          whatsapp_message_id?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          sent_via?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
          whatsapp_error?: string | null
          whatsapp_message_id?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_status?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          id: string
          member_id: string | null
          merchant_request_id: string | null
          method: string
          mpesa_receipt: string | null
          phone: string
          status: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          member_id?: string | null
          merchant_request_id?: string | null
          method: string
          mpesa_receipt?: string | null
          phone: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          member_id?: string | null
          merchant_request_id?: string | null
          method?: string
          mpesa_receipt?: string | null
          phone?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      pesapal_ipn_events: {
        Row: {
          created_at: string
          id: string
          merchant_reference: string | null
          notification_type: string | null
          order_tracking_id: string | null
          raw_payload: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_reference?: string | null
          notification_type?: string | null
          order_tracking_id?: string | null
          raw_payload?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          merchant_reference?: string | null
          notification_type?: string | null
          order_tracking_id?: string | null
          raw_payload?: Json | null
        }
        Relationships: []
      }
      pesapal_transactions: {
        Row: {
          amount: number
          confirmation_code: string | null
          contribution_id: string | null
          created_at: string
          currency: string
          description: string | null
          donation_id: string | null
          id: string
          initiated_by: string | null
          member_id: string | null
          merchant_reference: string
          order_tracking_id: string | null
          payment_account: string | null
          payment_method: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          confirmation_code?: string | null
          contribution_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          donation_id?: string | null
          id?: string
          initiated_by?: string | null
          member_id?: string | null
          merchant_reference: string
          order_tracking_id?: string | null
          payment_account?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          confirmation_code?: string | null
          contribution_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          donation_id?: string | null
          id?: string
          initiated_by?: string | null
          member_id?: string | null
          merchant_reference?: string
          order_tracking_id?: string | null
          payment_account?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesapal_transactions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesapal_transactions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "membership_fee_history_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesapal_transactions_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesapal_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          updated_at?: string | null
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
          additional_notes: string | null
          consecutive_absences: number | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          education_level: string | null
          email: string | null
          email_verified_at: string | null
          employment_status: string | null
          full_name: string
          id: string
          id_number: string | null
          interests: string[] | null
          is_student: boolean | null
          joined_at: string | null
          location: string | null
          membership_fee_amount: number | null
          membership_fee_paid: boolean | null
          membership_fee_paid_at: string | null
          membership_number: string | null
          next_membership_renewal_date: string | null
          occupation: string | null
          phone: string | null
          photo_url: string | null
          registration_completed_at: string | null
          registration_fee_paid: boolean | null
          registration_progress: number | null
          soft_deleted: boolean | null
          status: Database["public"]["Enums"]["member_status"] | null
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          consecutive_absences?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          education_level?: string | null
          email?: string | null
          email_verified_at?: string | null
          employment_status?: string | null
          full_name: string
          id: string
          id_number?: string | null
          interests?: string[] | null
          is_student?: boolean | null
          joined_at?: string | null
          location?: string | null
          membership_fee_amount?: number | null
          membership_fee_paid?: boolean | null
          membership_fee_paid_at?: string | null
          membership_number?: string | null
          next_membership_renewal_date?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          registration_completed_at?: string | null
          registration_fee_paid?: boolean | null
          registration_progress?: number | null
          soft_deleted?: boolean | null
          status?: Database["public"]["Enums"]["member_status"] | null
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          consecutive_absences?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          education_level?: string | null
          email?: string | null
          email_verified_at?: string | null
          employment_status?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          interests?: string[] | null
          is_student?: boolean | null
          joined_at?: string | null
          location?: string | null
          membership_fee_amount?: number | null
          membership_fee_paid?: boolean | null
          membership_fee_paid_at?: string | null
          membership_number?: string | null
          next_membership_renewal_date?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          registration_completed_at?: string | null
          registration_fee_paid?: boolean | null
          registration_progress?: number | null
          soft_deleted?: boolean | null
          status?: Database["public"]["Enums"]["member_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      realtime_change_log: {
        Row: {
          change_type: string
          changed_fields: string[] | null
          client_id: string | null
          conflict_resolved: boolean | null
          conflict_strategy: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          change_type: string
          changed_fields?: string[] | null
          client_id?: string | null
          conflict_resolved?: boolean | null
          conflict_strategy?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          change_type?: string
          changed_fields?: string[] | null
          client_id?: string | null
          conflict_resolved?: boolean | null
          conflict_strategy?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          contribution_id: string
          contribution_type: string
          created_at: string
          id: string
          initiated_by: string
          member_id: string
          original_amount: number
          payout_amount: number
          reason: string | null
          rejection_reason: string | null
          requested_amount: number
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contribution_id: string
          contribution_type: string
          created_at?: string
          id?: string
          initiated_by: string
          member_id: string
          original_amount: number
          payout_amount: number
          reason?: string | null
          rejection_reason?: string | null
          requested_amount: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contribution_id?: string
          contribution_type?: string
          created_at?: string
          id?: string
          initiated_by?: string
          member_id?: string
          original_amount?: number
          payout_amount?: number
          reason?: string | null
          rejection_reason?: string | null
          requested_amount?: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "membership_fee_history_v"
            referencedColumns: ["id"]
          },
        ]
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
      sms_notifications_queue: {
        Row: {
          attempts: number
          created_at: string
          event_id: string | null
          event_type: string
          id: string
          last_error: string | null
          message: string
          phone: string
          priority: string
          processed_at: string | null
          provider_message_id: string | null
          provider_response: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_id?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          message: string
          phone: string
          priority?: string
          processed_at?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_id?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          message?: string
          phone?: string
          priority?: string
          processed_at?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_verification_sessions: {
        Row: {
          code_hash: string
          consumed_at: string | null
          consumed_by: string | null
          created_at: string
          expires_at: string
          id: string
          last_sent_at: string
          max_verify_attempts: number
          phone: string
          purpose: string
          resend_available_at: string
          sends_count: number
          token_expires_at: string | null
          updated_at: string
          verification_token: string | null
          verified_at: string | null
          verify_attempts: number
        }
        Insert: {
          code_hash: string
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          expires_at: string
          id?: string
          last_sent_at?: string
          max_verify_attempts?: number
          phone: string
          purpose: string
          resend_available_at: string
          sends_count?: number
          token_expires_at?: string | null
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
          verify_attempts?: number
        }
        Update: {
          code_hash?: string
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_sent_at?: string
          max_verify_attempts?: number
          phone?: string
          purpose?: string
          resend_available_at?: string
          sends_count?: number
          token_expires_at?: string | null
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
          verify_attempts?: number
        }
        Relationships: []
      }
      till_submissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          member_id: string | null
          mpesa_receipt: string
          phone: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          member_id?: string | null
          mpesa_receipt: string
          phone: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          member_id?: string | null
          mpesa_receipt?: string
          phone?: string
          status?: string
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
          user_email: string | null
          user_id: string
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      user_status: {
        Row: {
          last_seen: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen?: string
          status?: string
          updated_at?: string
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
          {
            foreignKeyName: "votes_motion_id_fkey"
            columns: ["motion_id"]
            isOneToOne: false
            referencedRelation: "voting_motions_with_vote_breakdown"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_motion_id_fkey"
            columns: ["motion_id"]
            isOneToOne: false
            referencedRelation: "voting_motions_with_vote_count"
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
          status_updated_at: string | null
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
          status_updated_at?: string | null
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
          status_updated_at?: string | null
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
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          contribution_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          direction: string
          discipline_id: string | null
          id: string
          mpesa_transaction_id: string | null
          reference: string | null
          status: string
          type: string
          user_id: string
          wallet_id: string
          welfare_case_id: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction: string
          discipline_id?: string | null
          id?: string
          mpesa_transaction_id?: string | null
          reference?: string | null
          status?: string
          type: string
          user_id: string
          wallet_id: string
          welfare_case_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string
          discipline_id?: string | null
          id?: string
          mpesa_transaction_id?: string | null
          reference?: string | null
          status?: string
          type?: string
          user_id?: string
          wallet_id?: string
          welfare_case_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      welfare_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          mpesa_code: string | null
          notes: string | null
          recorded_by_id: string
          status: string
          transaction_type: string
          updated_at: string | null
          welfare_case_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          mpesa_code?: string | null
          notes?: string | null
          recorded_by_id: string
          status?: string
          transaction_type: string
          updated_at?: string | null
          welfare_case_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          mpesa_code?: string | null
          notes?: string | null
          recorded_by_id?: string
          status?: string
          transaction_type?: string
          updated_at?: string | null
          welfare_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "welfare_transactions_welfare_case_id_fkey"
            columns: ["welfare_case_id"]
            isOneToOne: false
            referencedRelation: "welfare_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_automation_events: {
        Row: {
          contact_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          member_id: string | null
          payload: Json
          processed_at: string | null
          source_id: string | null
          source_table: string | null
          status: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          member_id?: string | null
          payload?: Json
          processed_at?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          member_id?: string | null
          payload?: Json
          processed_at?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automation_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          created_at: string
          id: string
          last_bot_mode: string
          last_inbound_at: string | null
          last_outbound_at: string | null
          member_id: string | null
          opted_in: boolean
          phone_number: string
          profile_name: string | null
          updated_at: string
          wa_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_bot_mode?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          member_id?: string | null
          opted_in?: boolean
          phone_number: string
          profile_name?: string | null
          updated_at?: string
          wa_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_bot_mode?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          member_id?: string | null
          opted_in?: boolean
          phone_number?: string
          profile_name?: string | null
          updated_at?: string
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          contact_id: string | null
          created_at: string
          direction: string
          id: string
          member_id: string | null
          message_type: string
          payload: Json
          status: string
          status_updated_at: string | null
          text_body: string | null
          wa_message_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          direction: string
          id?: string
          member_id?: string | null
          message_type?: string
          payload?: Json
          status?: string
          status_updated_at?: string | null
          text_body?: string | null
          wa_message_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          member_id?: string | null
          message_type?: string
          payload?: Json
          status?: string
          status_updated_at?: string | null
          text_body?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_payment_intents: {
        Row: {
          amount: number
          checkout_request_id: string | null
          contact_id: string | null
          contribution_ids: string[]
          created_at: string
          failure_reason: string | null
          id: string
          member_id: string
          merchant_request_id: string | null
          mpesa_transaction_id: string | null
          payment_purpose: string
          phone_number: string
          status: string
          updated_at: string
          wallet_transaction_id: string | null
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          contact_id?: string | null
          contribution_ids?: string[]
          created_at?: string
          failure_reason?: string | null
          id?: string
          member_id: string
          merchant_request_id?: string | null
          mpesa_transaction_id?: string | null
          payment_purpose?: string
          phone_number: string
          status?: string
          updated_at?: string
          wallet_transaction_id?: string | null
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          contact_id?: string | null
          contribution_ids?: string[]
          created_at?: string
          failure_reason?: string | null
          id?: string
          member_id?: string
          merchant_request_id?: string | null
          mpesa_transaction_id?: string | null
          payment_purpose?: string
          phone_number?: string
          status?: string
          updated_at?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_payment_intents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_intents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_intents_mpesa_transaction_id_fkey"
            columns: ["mpesa_transaction_id"]
            isOneToOne: false
            referencedRelation: "mpesa_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_intents_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "member_wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kitty_group_totals_v: {
        Row: {
          combined_balance: number | null
          kitty_id: string | null
          rounds_count: number | null
          total_contributed_all_rounds: number | null
          total_disbursed_all_rounds: number | null
        }
        Relationships: []
      }
      kitty_roots_v: {
        Row: {
          kitty_id: string | null
          root_id: string | null
        }
        Relationships: []
      }
      kitty_top_contributors_per_kitty_v: {
        Row: {
          contribution_count: number | null
          full_name: string | null
          kitty_id: string | null
          member_id: string | null
          membership_number: string | null
          photo_url: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      kitty_top_contributors_v: {
        Row: {
          contribution_count: number | null
          full_name: string | null
          member_id: string | null
          membership_number: string | null
          photo_url: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      membership_fee_history_v: {
        Row: {
          amount: number | null
          created_at: string | null
          due_date: string | null
          id: string | null
          member_id: string | null
          member_name: string | null
          member_phone: string | null
          membership_number: string | null
          notes: string | null
          paid_at: string | null
          reference_number: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_changes: {
        Row: {
          change_type: string | null
          changed_fields: string[] | null
          client_id: string | null
          created_at: string | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          change_type?: string | null
          changed_fields?: string[] | null
          client_id?: string | null
          created_at?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          change_type?: string | null
          changed_fields?: string[] | null
          client_id?: string | null
          created_at?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      voting_motions_with_vote_breakdown: {
        Row: {
          created_at: string | null
          id: string | null
          no_votes: number | null
          status: string | null
          title: string | null
          total_votes: number | null
          yes_votes: number | null
        }
        Relationships: []
      }
      voting_motions_with_vote_count: {
        Row: {
          created_at: string | null
          id: string | null
          status: string | null
          title: string | null
          vote_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_signup_hook: { Args: { event: Json }; Returns: Json }
      can_interact_with_system: { Args: { _user_id: string }; Returns: boolean }
      consume_sms_verification_token: {
        Args: {
          _consumer?: string
          _phone: string
          _purpose: string
          _verification_token: string
        }
        Returns: boolean
      }
      contribute_to_kitty_from_wallet: {
        Args: { _amount: number; _kitty_id: string; _notes?: string }
        Returns: Json
      }
      create_renewal_fee: {
        Args: { member_id_param: string }
        Returns: boolean
      }
      credit_kitty_from_mpesa: {
        Args: {
          _amount: number
          _kitty_id: string
          _member_id: string
          _mpesa_transaction_id: string
          _reference: string
        }
        Returns: string
      }
      credit_member_wallet: {
        Args: {
          p_amount: number
          p_reference_number?: string
          p_wallet_transaction_id: string
        }
        Returns: undefined
      }
      current_user_id: { Args: never; Returns: string }
      delete_expired_jobs: { Args: never; Returns: number }
      ensure_finance_approvals: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: undefined
      }
      ensure_wallet: { Args: { _user_id: string }; Returns: string }
      generate_membership_fee_renewals: { Args: never; Returns: undefined }
      generate_membership_number: { Args: never; Returns: string }
      get_membership_fee_history: {
        Args: {
          _cursor_created_at?: string
          _cursor_id?: string
          _from_date?: string
          _limit?: number
          _search?: string
          _status?: string
          _to_date?: string
        }
        Returns: {
          amount: number | null
          created_at: string | null
          due_date: string | null
          id: string | null
          member_id: string | null
          member_name: string | null
          member_phone: string | null
          membership_number: string | null
          notes: string | null
          paid_at: string | null
          reference_number: string | null
          status: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "membership_fee_history_v"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_any_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_management_committee: { Args: { _user_id: string }; Returns: boolean }
      is_official: { Args: { _user_id: string }; Returns: boolean }
      is_valid_kenyan_phone: { Args: { _raw_phone: string }; Returns: boolean }
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
      mark_private_conversation_read: {
        Args: { _conversation_id: string }
        Returns: number
      }
      normalize_ke_phone: { Args: { _raw: string }; Returns: string }
      normalize_kenyan_phone: { Args: { _raw_phone: string }; Returns: string }
      process_wallet_transaction: {
        Args: {
          _amount: number
          _contribution_id?: string
          _description?: string
          _direction: string
          _discipline_id?: string
          _mpesa_transaction_id?: string
          _reference?: string
          _type: string
          _user_id: string
          _welfare_case_id?: string
        }
        Returns: string
      }
      queue_sms_notification: {
        Args: {
          _event_id: string
          _event_type: string
          _message: string
          _priority?: string
          _user_id: string
        }
        Returns: undefined
      }
      record_kitty_disbursement: {
        Args: {
          _amount: number
          _kitty_id: string
          _purpose: string
          _recipient?: string
          _reference?: string
        }
        Returns: string
      }
      sms_priority_rank: { Args: { _priority: string }; Returns: number }
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
      job_status: "pending" | "approved" | "rejected"
      job_type:
        | "casual"
        | "contract"
        | "part_time"
        | "full_time"
        | "permanent"
        | "temporary"
        | "internship"
        | "volunteer"
        | "other"
      kitty_category:
        | "emergency"
        | "education"
        | "welfare"
        | "project"
        | "other"
      kitty_source: "mpesa" | "wallet" | "manual"
      kitty_status: "active" | "paused" | "completed" | "closed"
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
      job_status: ["pending", "approved", "rejected"],
      job_type: [
        "casual",
        "contract",
        "part_time",
        "full_time",
        "permanent",
        "temporary",
        "internship",
        "volunteer",
        "other",
      ],
      kitty_category: ["emergency", "education", "welfare", "project", "other"],
      kitty_source: ["mpesa", "wallet", "manual"],
      kitty_status: ["active", "paused", "completed", "closed"],
      member_status: ["active", "dormant", "pending", "suspended"],
    },
  },
} as const
