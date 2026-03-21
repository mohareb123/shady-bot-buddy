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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: number
          admin_name: string | null
          chat_id: number
          id: string
          reason: string | null
          target_id: number | null
          target_name: string | null
          timestamp: string
        }
        Insert: {
          action: string
          admin_id: number
          admin_name?: string | null
          chat_id: number
          id?: string
          reason?: string | null
          target_id?: number | null
          target_name?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          admin_id?: number
          admin_name?: string | null
          chat_id?: number
          id?: string
          reason?: string | null
          target_id?: number | null
          target_name?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      auto_responses: {
        Row: {
          chat_id: number
          created_at: string
          created_by: string | null
          id: string
          response: string
          trigger_word: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          created_by?: string | null
          id?: string
          response: string
          trigger_word: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          created_by?: string | null
          id?: string
          response?: string
          trigger_word?: string
        }
        Relationships: []
      }
      group_settings: {
        Row: {
          chat_id: number
          created_at: string
          links_allowed: boolean
          max_warnings: number
          media_allowed: boolean
          spam_protection: boolean
          welcome_enabled: boolean
        }
        Insert: {
          chat_id: number
          created_at?: string
          links_allowed?: boolean
          max_warnings?: number
          media_allowed?: boolean
          spam_protection?: boolean
          welcome_enabled?: boolean
        }
        Update: {
          chat_id?: number
          created_at?: string
          links_allowed?: boolean
          max_warnings?: number
          media_allowed?: boolean
          spam_protection?: boolean
          welcome_enabled?: boolean
        }
        Relationships: []
      }
      members: {
        Row: {
          chat_id: number
          coins: number
          full_name: string | null
          join_date: string
          last_active: string
          last_daily: string | null
          level: number
          messages_count: number
          points: number
          user_id: number
          username: string | null
          warnings: number
        }
        Insert: {
          chat_id: number
          coins?: number
          full_name?: string | null
          join_date?: string
          last_active?: string
          last_daily?: string | null
          level?: number
          messages_count?: number
          points?: number
          user_id: number
          username?: string | null
          warnings?: number
        }
        Update: {
          chat_id?: number
          coins?: number
          full_name?: string | null
          join_date?: string
          last_active?: string
          last_daily?: string | null
          level?: number
          messages_count?: number
          points?: number
          user_id?: number
          username?: string | null
          warnings?: number
        }
        Relationships: []
      }
      messages_log: {
        Row: {
          chat_id: number
          id: string
          message_preview: string | null
          timestamp: string
          user_id: number
          user_name: string | null
        }
        Insert: {
          chat_id: number
          id?: string
          message_preview?: string | null
          timestamp?: string
          user_id: number
          user_name?: string | null
        }
        Update: {
          chat_id?: number
          id?: string
          message_preview?: string | null
          timestamp?: string
          user_id?: number
          user_name?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          created_by: number | null
          id: string
          is_sent: boolean
          message: string
        }
        Insert: {
          created_at?: string
          created_by?: number | null
          id?: string
          is_sent?: boolean
          message: string
        }
        Update: {
          created_at?: string
          created_by?: number | null
          id?: string
          is_sent?: boolean
          message?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          answer: string
          category: string | null
          id: string
          options: Json
          question: string
        }
        Insert: {
          answer: string
          category?: string | null
          id?: string
          options?: Json
          question: string
        }
        Update: {
          answer?: string
          category?: string | null
          id?: string
          options?: Json
          question?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_messages: {
        Row: {
          chat_id: number
          created_at: string
          raw_update: Json
          text: string | null
          update_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string
          raw_update: Json
          text?: string | null
          update_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string
          raw_update?: Json
          text?: string | null
          update_id?: number
        }
        Relationships: []
      }
      user_titles: {
        Row: {
          chat_id: number
          title: string
          user_id: number
        }
        Insert: {
          chat_id: number
          title: string
          user_id: number
        }
        Update: {
          chat_id?: number
          title?: string
          user_id?: number
        }
        Relationships: []
      }
      whispers: {
        Row: {
          chat_id: number
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_id: number
          recipient_name: string | null
          sender_id: number
          sender_name: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_id: number
          recipient_name?: string | null
          sender_id: number
          sender_name?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: number
          recipient_name?: string | null
          sender_id?: number
          sender_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
