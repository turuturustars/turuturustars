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
      profiles: {
        Row: {
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
      is_official: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "treasurer"
        | "secretary"
        | "chairperson"
        | "coordinator"
        | "member"
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
      ],
      contribution_status: ["paid", "pending", "missed"],
      member_status: ["active", "dormant", "pending", "suspended"],
    },
  },
} as const
