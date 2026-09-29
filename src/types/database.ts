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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          after_data: Json | null
          before_data: Json | null
          branch_id: string | null
          created_at: string
          id: number
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          after_data?: Json | null
          before_data?: Json | null
          branch_id?: string | null
          created_at?: string
          id?: never
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          after_data?: Json | null
          before_data?: Json | null
          branch_id?: string | null
          created_at?: string
          id?: never
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      exam_answers: {
        Row: {
          attempt_id: string
          category_key: string
          created_at: string
          id: number
          is_correct: boolean
          question_id: string
          selected_answer: number
        }
        Insert: {
          attempt_id: string
          category_key: string
          created_at?: string
          id?: never
          is_correct: boolean
          question_id: string
          selected_answer: number
        }
        Update: {
          attempt_id?: string
          category_key?: string
          created_at?: string
          id?: never
          is_correct?: boolean
          question_id?: string
          selected_answer?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          branch_id_snapshot: string | null
          client_result_id: string
          completed_at: string
          correct_count: number
          created_at: string
          employee_level_snapshot:
            | Database["public"]["Enums"]["employee_level"]
            | null
          id: string
          mode: string
          score: number
          started_at: string
          total_questions: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          branch_id_snapshot?: string | null
          client_result_id: string
          completed_at: string
          correct_count: number
          created_at?: string
          employee_level_snapshot?:
            | Database["public"]["Enums"]["employee_level"]
            | null
          id?: string
          mode: string
          score: number
          started_at: string
          total_questions: number
          user_id: string
          wrong_count: number
        }
        Update: {
          branch_id_snapshot?: string | null
          client_result_id?: string
          completed_at?: string
          correct_count?: number
          created_at?: string
          employee_level_snapshot?:
            | Database["public"]["Enums"]["employee_level"]
            | null
          id?: string
          mode?: string
          score?: number
          started_at?: string
          total_questions?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_branch_id_snapshot_fkey"
            columns: ["branch_id_snapshot"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_daily_activity: {
        Row: {
          activity_date: string
          branch_id_snapshot: string | null
          created_at: string
          employee_level_snapshot:
            | Database["public"]["Enums"]["employee_level"]
            | null
          id: string
          study_seconds: number
          study_sessions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          branch_id_snapshot?: string | null
          created_at?: string
          employee_level_snapshot?:
            | Database["public"]["Enums"]["employee_level"]
            | null
          id?: string
          study_seconds?: number
          study_sessions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          branch_id_snapshot?: string | null
          created_at?: string
          employee_level_snapshot?:
            | Database["public"]["Enums"]["employee_level"]
            | null
          id?: string
          study_seconds?: number
          study_sessions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_daily_activity_branch_id_snapshot_fkey"
            columns: ["branch_id_snapshot"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_images: {
        Row: {
          created_at: string
          id: string
          notice_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          notice_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          notice_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_images_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_reads: {
        Row: {
          notice_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notice_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notice_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_reads_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author_user_id: string
          body: string
          branch_id: string | null
          created_at: string
          id: string
          scope: Database["public"]["Enums"]["notice_scope"]
          title: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          body: string
          branch_id?: string | null
          created_at?: string
          id?: string
          scope: Database["public"]["Enums"]["notice_scope"]
          title: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          scope?: Database["public"]["Enums"]["notice_scope"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          email: string
          employee_level: Database["public"]["Enums"]["employee_level"] | null
          id: string
          is_developer: boolean
          is_super_admin: boolean
          name: string
          phone_number: string | null
          requested_branch_id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          email: string
          employee_level?: Database["public"]["Enums"]["employee_level"] | null
          id: string
          is_developer?: boolean
          is_super_admin?: boolean
          name: string
          phone_number?: string | null
          requested_branch_id: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          employee_level?: Database["public"]["Enums"]["employee_level"] | null
          id?: string
          is_developer?: boolean
          is_super_admin?: boolean
          name?: string
          phone_number?: string | null
          requested_branch_id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_requested_branch_id_fkey"
            columns: ["requested_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_bundles: {
        Row: {
          created_at: string
          is_current: boolean
          payload: Json
          question_count: number
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          is_current?: boolean
          payload: Json
          question_count: number
          uploaded_by?: string | null
          version?: never
        }
        Update: {
          created_at?: string
          is_current?: boolean
          payload?: Json
          question_count?: number
          uploaded_by?: string | null
          version?: never
        }
        Relationships: []
      }
      study_progress: {
        Row: {
          branch_id_snapshot: string | null
          category_key: string
          correct_count: number
          created_at: string
          employee_level_snapshot:
            | Database["public"]["Enums"]["employee_level"]
            | null
          id: string
          last_studied_at: string
          question_id: string
          study_count: number
          updated_at: string
          user_id: string
          wrong_count: number
        }
        Insert: {
          branch_id_snapshot?: string | null
          category_key: string
          correct_count?: number
          created_at?: string
          employee_level_snapshot?:
            | Database["public"]["Enums"]["employee_level"]
            | null
          id?: string
          last_studied_at: string
          question_id: string
          study_count?: number
          updated_at?: string
          user_id: string
          wrong_count?: number
        }
        Update: {
          branch_id_snapshot?: string | null
          category_key?: string
          correct_count?: number
          created_at?: string
          employee_level_snapshot?:
            | Database["public"]["Enums"]["employee_level"]
            | null
          id?: string
          last_studied_at?: string
          question_id?: string
          study_count?: number
          updated_at?: string
          user_id?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_progress_branch_id_snapshot_fkey"
            columns: ["branch_id_snapshot"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_branch: {
        Args: { target_branch_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "branches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_user: {
        Args: {
          selected_level?: Database["public"]["Enums"]["employee_level"]
          target_user_id: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          email: string
          employee_level: Database["public"]["Enums"]["employee_level"] | null
          id: string
          is_super_admin: boolean
          name: string
          requested_branch_id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      begin_study_session: { Args: { started_at?: string }; Returns: undefined }
      change_employee_branch: {
        Args: { new_branch_id: string; target_user_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          email: string
          employee_level: Database["public"]["Enums"]["employee_level"] | null
          id: string
          is_super_admin: boolean
          name: string
          requested_branch_id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_employee_level: {
        Args: {
          new_level: Database["public"]["Enums"]["employee_level"]
          target_user_id: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          email: string
          employee_level: Database["public"]["Enums"]["employee_level"] | null
          id: string
          is_super_admin: boolean
          name: string
          requested_branch_id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_employee_status: {
        Args: {
          new_status: Database["public"]["Enums"]["account_status"]
          target_user_id: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          email: string
          employee_level: Database["public"]["Enums"]["employee_level"] | null
          id: string
          is_super_admin: boolean
          name: string
          requested_branch_id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_super_admin_status: {
        Args: {
          enabled: boolean
          fallback_level?: Database["public"]["Enums"]["employee_level"]
          target_user_id: string
        }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
      }
      create_branch: {
        Args: { branch_name: string; branch_sort_order?: number }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "branches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_notice: {
        Args: {
          image_paths?: string[]
          notice_body: string
          notice_branch_id: string
          notice_scope: Database["public"]["Enums"]["notice_scope"]
          notice_title: string
        }
        Returns: {
          author_user_id: string
          body: string
          branch_id: string | null
          created_at: string
          id: string
          scope: Database["public"]["Enums"]["notice_scope"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_branch: {
        Args: { target_branch_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "branches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_notice: { Args: { target_notice_id: string }; Returns: string[] }
      mark_notice_read: {
        Args: { target_notice_id: string }
        Returns: undefined
      }
      record_exam_attempt: {
        Args: {
          answers: Json
          client_result_id: string
          completed_at: string
          correct_count: number
          exam_mode: string
          exam_score: number
          started_at: string
          total_questions: number
          wrong_count: number
        }
        Returns: string
      }
      record_learning_duration: {
        Args: { duration_seconds: number; recorded_at?: string }
        Returns: undefined
      }
      record_study_attempt: {
        Args: {
          category_key: string
          first_attempt: boolean
          is_correct: boolean
          question_id: string
          studied_at?: string
        }
        Returns: undefined
      }
      register_push_token: {
        Args: { device_platform: string; push_token: string }
        Returns: undefined
      }
      reject_user: {
        Args: { target_user_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          email: string
          employee_level: Database["public"]["Enums"]["employee_level"] | null
          id: string
          is_super_admin: boolean
          name: string
          requested_branch_id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      replace_recipe_bundle: {
        Args: { bundle: Json }
        Returns: Database["public"]["Tables"]["recipe_bundles"]["Row"]
      }
      unregister_push_token: {
        Args: { push_token: string }
        Returns: undefined
      }
      update_branch: {
        Args: {
          branch_name: string
          branch_sort_order: number
          target_branch_id: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "branches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_notice: {
        Args: {
          image_paths?: string[]
          notice_body: string
          notice_title: string
          target_notice_id: string
        }
        Returns: {
          author_user_id: string
          body: string
          branch_id: string | null
          created_at: string
          id: string
          scope: Database["public"]["Enums"]["notice_scope"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_status: "pending" | "active" | "rejected" | "suspended"
      employee_level:
        | "branch_manager"
        | "manager"
        | "captain"
        | "trainer"
        | "part_timer"
      notice_scope: "global" | "branch"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["pending", "active", "rejected", "suspended"],
      employee_level: [
        "branch_manager",
        "manager",
        "captain",
        "trainer",
        "part_timer",
      ],
      notice_scope: ["global", "branch"],
    },
  },
} as const
