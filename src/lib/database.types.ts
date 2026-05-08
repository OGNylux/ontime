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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ontime_active_recording: {
        Row: {
          calendar_entry_id: string | null
          created_at: string
          created_by: string
          id: string
          is_billable: boolean
          project_id: string | null
          started_at: string
          task_id: string | null
          title: string | null
          workspace_id: string
        }
        Insert: {
          calendar_entry_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_billable?: boolean
          project_id?: string | null
          started_at?: string
          task_id?: string | null
          title?: string | null
          workspace_id: string
        }
        Update: {
          calendar_entry_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_billable?: boolean
          project_id?: string | null
          started_at?: string
          task_id?: string | null
          title?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ontime_active_recording_calendar_entry_id_fkey"
            columns: ["calendar_entry_id"]
            isOneToOne: false
            referencedRelation: "ontime_calendar_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_active_recording_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ontime_project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_active_recording_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ontime_task"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_active_recording_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_calendar_entry: {
        Row: {
          created_at: string
          created_by: string
          end_time: string
          id: string
          invoice_id: string | null
          is_billable: boolean
          project_id: string | null
          start_time: string
          task_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_time: string
          id?: string
          invoice_id?: string | null
          is_billable?: boolean
          project_id?: string | null
          start_time: string
          task_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_time?: string
          id?: string
          invoice_id?: string | null
          is_billable?: boolean
          project_id?: string | null
          start_time?: string
          task_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ontime_calendar_entry_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ontime_invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_calendar_entry_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ontime_project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_calendar_entry_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ontime_task"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_calendar_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_client: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          info_id: string | null
          name: string
          pinned: boolean
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          info_id?: string | null
          name: string
          pinned?: boolean
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          info_id?: string | null
          name?: string
          pinned?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ontime_client_info_id_fkey"
            columns: ["info_id"]
            isOneToOne: true
            referencedRelation: "ontime_client_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_client_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_client_info: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          email: string | null
          house_number: string | null
          id: string
          phone: string | null
          postal_code: string | null
          state: string | null
          street: string | null
          vat_number: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          house_number?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          vat_number?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          house_number?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      ontime_invoice: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          pdf_storage_path: string | null
          sent_at: string | null
          status: string
          tax_rate: number
          workspace_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          status?: string
          tax_rate?: number
          workspace_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          status?: string
          tax_rate?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ontime_invoice_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ontime_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_invoice_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_hours_per_client"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ontime_invoice_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_invoice_line_item: {
        Row: {
          amount: number
          calendar_entry_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          invoice_id: string
          quantity_hours: number
          unit_price: number
        }
        Insert: {
          amount?: number
          calendar_entry_id?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          invoice_id: string
          quantity_hours: number
          unit_price: number
        }
        Update: {
          amount?: number
          calendar_entry_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity_hours?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "ontime_invoice_line_item_calendar_entry_id_fkey"
            columns: ["calendar_entry_id"]
            isOneToOne: false
            referencedRelation: "ontime_calendar_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_invoice_line_item_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ontime_invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_notification: {
        Row: {
          body: string
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          ref_id: string | null
          title: string
          type: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          ref_id?: string | null
          title: string
          type: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          ref_id?: string | null
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontime_notification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ontime_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_notification_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_project: {
        Row: {
          client_id: string | null
          color: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          hourly_rate: number | null
          id: string
          name: string
          pinned: boolean
          start_date: string | null
          workspace_id: string
        }
        Insert: {
          client_id?: string | null
          color?: number | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          pinned?: boolean
          start_date?: string | null
          workspace_id: string
        }
        Update: {
          client_id?: string | null
          color?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          pinned?: boolean
          start_date?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ontime_project_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ontime_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_project_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_hours_per_client"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ontime_project_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_task: {
        Row: {
          color: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
          pinned: boolean
          project_id: string
          workspace_id: string
        }
        Insert: {
          color?: number | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          name: string
          pinned?: boolean
          project_id: string
          workspace_id: string
        }
        Update: {
          color?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name?: string
          pinned?: boolean
          project_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ontime_task_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ontime_project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_task_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_user: {
        Row: {
          active_workspace_id: string | null
          created_at: string
          id: string
          name: string
          timezone: string | null
        }
        Insert: {
          active_workspace_id?: string | null
          created_at?: string
          id: string
          name: string
          timezone?: string | null
        }
        Update: {
          active_workspace_id?: string | null
          created_at?: string
          id?: string
          name?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontime_user_active_workspace_fk"
            columns: ["active_workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_workspace: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ontime_workspace_billing: {
        Row: {
          account_holder: string | null
          bank_name: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          house_number: string | null
          iban: string | null
          id: string
          phone: string | null
          postal_code: string | null
          state: string | null
          street: string | null
          swift: string | null
          vat_number: string | null
          workspace_id: string
        }
        Insert: {
          account_holder?: string | null
          bank_name?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          iban?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          swift?: string | null
          vat_number?: string | null
          workspace_id: string
        }
        Update: {
          account_holder?: string | null
          bank_name?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          iban?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          swift?: string | null
          vat_number?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ontime_workspace_billing_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_workspace_invite: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: string
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ontime_workspace_invite_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      ontime_workspace_member: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ontime_workspace_member_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ontime_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_workspace_member_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_billable_summary: {
        Row: {
          is_billable: boolean | null
          total_hours: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontime_calendar_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hours_per_client: {
        Row: {
          billable_hours: number | null
          client_id: string | null
          total_hours: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontime_calendar_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hours_per_day: {
        Row: {
          billable_hours: number | null
          created_by: string | null
          day: string | null
          total_hours: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontime_calendar_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hours_per_project: {
        Row: {
          billable_hours: number | null
          created_by: string | null
          project_id: string | null
          total_hours: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontime_calendar_entry_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ontime_project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_calendar_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hours_per_task: {
        Row: {
          billable_hours: number | null
          created_by: string | null
          project_id: string | null
          task_id: string | null
          total_hours: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontime_calendar_entry_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ontime_project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_calendar_entry_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ontime_task"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontime_calendar_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hours_per_user: {
        Row: {
          billable_hours: number | null
          created_by: string | null
          total_hours: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontime_calendar_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ontime_workspace"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_workspace_invite: { Args: { p_token: string }; Returns: undefined }
      check_user_exists:
        | { Args: { email_input: string }; Returns: Json }
        | { Args: { email_input: string; name_input: string }; Returns: Json }
      create_workspace_invite: {
        Args: {
          p_email: string
          p_role?: string
          p_ttl_hours?: number
          p_workspace_id: string
        }
        Returns: string
      }
      generate_invoice_number: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      get_overview_aggregates: {
        Args: {
          p_client_ids?: string[]
          p_end: string
          p_project_ids?: string[]
          p_start: string
          p_workspace_id: string
        }
        Returns: {
          billable_minutes: number
          client_id: string
          day: string
          project_color: number
          project_id: string
          project_name: string
          revenue: number
          task_id: string
          task_name: string
          total_minutes: number
        }[]
      }
      has_workspace_role: {
        Args: { p_roles: string[]; p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      purge_soft_deleted_records: {
        Args: { p_older_than?: string }
        Returns: {
          deleted_count: number
          entity: string
        }[]
      }
      set_active_workspace: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
