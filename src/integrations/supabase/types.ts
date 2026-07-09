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
      achievements: {
        Row: {
          description: string
          icon: string
          id: string
          name: string
          required_value: number | null
        }
        Insert: {
          description: string
          icon: string
          id: string
          name: string
          required_value?: number | null
        }
        Update: {
          description?: string
          icon?: string
          id?: string
          name?: string
          required_value?: number | null
        }
        Relationships: []
      }
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
      ads: {
        Row: {
          chat_id: number
          content: string
          created_at: string
          id: string
          is_sent: boolean
          payment_id: string | null
          scheduled_at: string | null
          user_id: number
        }
        Insert: {
          chat_id: number
          content: string
          created_at?: string
          id?: string
          is_sent?: boolean
          payment_id?: string | null
          scheduled_at?: string | null
          user_id: number
        }
        Update: {
          chat_id?: number
          content?: string
          created_at?: string
          id?: string
          is_sent?: boolean
          payment_id?: string | null
          scheduled_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ads_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      afk_status: {
        Row: {
          chat_id: number
          reason: string | null
          since: string | null
          user_id: number
        }
        Insert: {
          chat_id: number
          reason?: string | null
          since?: string | null
          user_id: number
        }
        Update: {
          chat_id?: number
          reason?: string | null
          since?: string | null
          user_id?: number
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
      bot_messages: {
        Row: {
          chat_id: number
          created_at: string
          message_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string
          message_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string
          message_id?: number
        }
        Relationships: []
      }
      browser_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          input: Json | null
          output: Json | null
          screenshot_url: string | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          input?: Json | null
          output?: Json | null
          screenshot_url?: string | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          input?: Json | null
          output?: Json | null
          screenshot_url?: string | null
          session_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "browser_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "browser_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      browser_contexts: {
        Row: {
          bb_context_id: string
          created_at: string
          description: string | null
          id: string
          last_used_at: string | null
          logged_in: boolean | null
          metadata: Json | null
          site_name: string
        }
        Insert: {
          bb_context_id: string
          created_at?: string
          description?: string | null
          id?: string
          last_used_at?: string | null
          logged_in?: boolean | null
          metadata?: Json | null
          site_name: string
        }
        Update: {
          bb_context_id?: string
          created_at?: string
          description?: string | null
          id?: string
          last_used_at?: string | null
          logged_in?: boolean | null
          metadata?: Json | null
          site_name?: string
        }
        Relationships: []
      }
      browser_sessions: {
        Row: {
          bb_session_id: string
          connect_url: string | null
          context_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          last_screenshot: string | null
          live_view_url: string | null
          metadata: Json | null
          site_name: string | null
          started_by: number | null
          status: string
        }
        Insert: {
          bb_session_id: string
          connect_url?: string | null
          context_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          last_screenshot?: string | null
          live_view_url?: string | null
          metadata?: Json | null
          site_name?: string | null
          started_by?: number | null
          status?: string
        }
        Update: {
          bb_session_id?: string
          connect_url?: string | null
          context_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          last_screenshot?: string | null
          live_view_url?: string | null
          metadata?: Json | null
          site_name?: string | null
          started_by?: number | null
          status?: string
        }
        Relationships: []
      }
      conversation_memory: {
        Row: {
          chat_id: number
          content: string
          created_at: string
          id: string
          role: string
          user_id: number
        }
        Insert: {
          chat_id: number
          content: string
          created_at?: string
          id?: string
          role?: string
          user_id: number
        }
        Update: {
          chat_id?: number
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: number
        }
        Relationships: []
      }
      dashboard_links: {
        Row: {
          chat_id: number
          chat_title: string | null
          code: string
          created_at: string | null
          id: string
          used: boolean | null
        }
        Insert: {
          chat_id: number
          chat_title?: string | null
          code: string
          created_at?: string | null
          id?: string
          used?: boolean | null
        }
        Update: {
          chat_id?: number
          chat_title?: string | null
          code?: string
          created_at?: string | null
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      dashboard_users: {
        Row: {
          chat_id: number
          created_at: string | null
          display_name: string | null
          id: string
          is_developer: boolean | null
          user_id: string
        }
        Insert: {
          chat_id: number
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_developer?: boolean | null
          user_id: string
        }
        Update: {
          chat_id?: number
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_developer?: boolean | null
          user_id?: string
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
          rules: string | null
          spam_protection: boolean
          welcome_enabled: boolean
        }
        Insert: {
          chat_id: number
          created_at?: string
          links_allowed?: boolean
          max_warnings?: number
          media_allowed?: boolean
          rules?: string | null
          spam_protection?: boolean
          welcome_enabled?: boolean
        }
        Update: {
          chat_id?: number
          created_at?: string
          links_allowed?: boolean
          max_warnings?: number
          media_allowed?: boolean
          rules?: string | null
          spam_protection?: boolean
          welcome_enabled?: boolean
        }
        Relationships: []
      }
      lottery_entries: {
        Row: {
          chat_id: number
          created_at: string | null
          id: string
          round_id: string
          tickets: number | null
          user_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string | null
          id?: string
          round_id: string
          tickets?: number | null
          user_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string | null
          id?: string
          round_id?: string
          tickets?: number | null
          user_id?: number
        }
        Relationships: []
      }
      member_achievements: {
        Row: {
          achievement_id: string
          chat_id: number
          unlocked_at: string | null
          user_id: number
        }
        Insert: {
          achievement_id: string
          chat_id: number
          unlocked_at?: string | null
          user_id: number
        }
        Update: {
          achievement_id?: string
          chat_id?: number
          unlocked_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      member_reputation: {
        Row: {
          chat_id: number
          created_at: string | null
          from_user_id: number
          id: string
          to_user_id: number
          value: number
        }
        Insert: {
          chat_id: number
          created_at?: string | null
          from_user_id: number
          id?: string
          to_user_id: number
          value: number
        }
        Update: {
          chat_id?: number
          created_at?: string | null
          from_user_id?: number
          id?: string
          to_user_id?: number
          value?: number
        }
        Relationships: []
      }
      members: {
        Row: {
          chat_id: number
          coins: number
          daily_streak: number | null
          full_name: string | null
          join_date: string
          last_active: string
          last_daily: string | null
          level: number
          messages_count: number
          points: number
          quiz_correct: number | null
          reputation: number | null
          total_gifted: number | null
          user_id: number
          username: string | null
          warnings: number
        }
        Insert: {
          chat_id: number
          coins?: number
          daily_streak?: number | null
          full_name?: string | null
          join_date?: string
          last_active?: string
          last_daily?: string | null
          level?: number
          messages_count?: number
          points?: number
          quiz_correct?: number | null
          reputation?: number | null
          total_gifted?: number | null
          user_id: number
          username?: string | null
          warnings?: number
        }
        Update: {
          chat_id?: number
          coins?: number
          daily_streak?: number | null
          full_name?: string | null
          join_date?: string
          last_active?: string
          last_daily?: string | null
          level?: number
          messages_count?: number
          points?: number
          quiz_correct?: number | null
          reputation?: number | null
          total_gifted?: number | null
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
      payment_requests: {
        Row: {
          amount: number
          chat_id: number
          created_at: string
          id: string
          proof_file_id: string | null
          resolved_at: string | null
          resolved_by: number | null
          service_details: string | null
          service_type: string
          status: string
          user_id: number
          user_name: string | null
        }
        Insert: {
          amount: number
          chat_id: number
          created_at?: string
          id?: string
          proof_file_id?: string | null
          resolved_at?: string | null
          resolved_by?: number | null
          service_details?: string | null
          service_type: string
          status?: string
          user_id: number
          user_name?: string | null
        }
        Update: {
          amount?: number
          chat_id?: number
          created_at?: string
          id?: string
          proof_file_id?: string | null
          resolved_at?: string | null
          resolved_by?: number | null
          service_details?: string | null
          service_type?: string
          status?: string
          user_id?: number
          user_name?: string | null
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          id: string
          option_index: number
          poll_id: string
          user_id: number
        }
        Insert: {
          id?: string
          option_index: number
          poll_id: string
          user_id: number
        }
        Update: {
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          chat_id: number
          created_at: string | null
          created_by: number
          id: string
          is_active: boolean | null
          options: Json
          question: string
        }
        Insert: {
          chat_id: number
          created_at?: string | null
          created_by: number
          id?: string
          is_active?: boolean | null
          options?: Json
          question: string
        }
        Update: {
          chat_id?: number
          created_at?: string | null
          created_by?: number
          id?: string
          is_active?: boolean | null
          options?: Json
          question?: string
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
      reminders: {
        Row: {
          chat_id: number
          created_at: string | null
          id: string
          is_sent: boolean | null
          message: string
          remind_at: string
          user_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          message: string
          remind_at: string
          user_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          message?: string
          remind_at?: string
          user_id?: number
        }
        Relationships: []
      }
      store_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cash: number
          price_coins: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cash?: number
          price_coins?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cash?: number
          price_coins?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          chat_id: number
          created_at: string
          expires_at: string | null
          id: string
          tier: string
          user_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string
          expires_at?: string | null
          id?: string
          tier?: string
          user_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          tier?: string
          user_id?: number
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
      user_ai_prefs: {
        Row: {
          fast_mode: boolean
          model: string
          updated_at: string
          user_id: number
        }
        Insert: {
          fast_mode?: boolean
          model?: string
          updated_at?: string
          user_id: number
        }
        Update: {
          fast_mode?: boolean
          model?: string
          updated_at?: string
          user_id?: number
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
