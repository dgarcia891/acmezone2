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
      az_app_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      az_excluded_ips: {
        Row: {
          created_at: string
          excluded_by: string | null
          id: string
          ip_address: string
        }
        Insert: {
          created_at?: string
          excluded_by?: string | null
          id?: string
          ip_address: string
        }
        Update: {
          created_at?: string
          excluded_by?: string | null
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      az_page_views: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          path: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          path: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          path?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      az_products: {
        Row: {
          category: string
          created_at: string
          description: string
          display_order: number
          features: string[]
          id: string
          image: string
          images: string[] | null
          is_active: boolean
          link: string | null
          name: string
          price_label: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          summary: string
          tags: string[]
          type: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          display_order?: number
          features?: string[]
          id: string
          image: string
          images?: string[] | null
          is_active?: boolean
          link?: string | null
          name: string
          price_label?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          summary: string
          tags?: string[]
          type?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          features?: string[]
          id?: string
          image?: string
          images?: string[] | null
          is_active?: boolean
          link?: string | null
          name?: string
          price_label?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          summary?: string
          tags?: string[]
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      az_profiles: {
        Row: {
          created_at: string
          daily_usage_count: number
          email: string
          has_byok_license: boolean
          id: string
          is_pro: boolean
          last_usage_reset: string
          trial_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_usage_count?: number
          email: string
          has_byok_license?: boolean
          id?: string
          is_pro?: boolean
          last_usage_reset?: string
          trial_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_usage_count?: number
          email?: string
          has_byok_license?: boolean
          id?: string
          is_pro?: boolean
          last_usage_reset?: string
          trial_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      az_usage_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      az_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      pattern_adjustments: {
        Row: {
          adjusted_by: string | null
          adjustment_reason: string | null
          correction_id: string | null
          created_at: string
          id: string
          new_weight: number
          old_weight: number
          phrase_id: string | null
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_reason?: string | null
          correction_id?: string | null
          created_at?: string
          id?: string
          new_weight: number
          old_weight: number
          phrase_id?: string | null
        }
        Update: {
          adjusted_by?: string | null
          adjustment_reason?: string | null
          correction_id?: string | null
          created_at?: string
          id?: string
          new_weight?: number
          old_weight?: number
          phrase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pattern_adjustments_correction_id_fkey"
            columns: ["correction_id"]
            isOneToOne: false
            referencedRelation: "sa_corrections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_adjustments_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "sa_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sa_corrections: {
        Row: {
          ai_analysis: Json | null
          ai_review_result: Json | null
          created_at: string
          detection_id: string | null
          feedback: string
          id: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          url_hash: string
          user_comment: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_review_result?: Json | null
          created_at?: string
          detection_id?: string | null
          feedback: string
          id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          url_hash: string
          user_comment?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_review_result?: Json | null
          created_at?: string
          detection_id?: string | null
          feedback?: string
          id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          url_hash?: string
          user_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sa_corrections_detection_id_fkey"
            columns: ["detection_id"]
            isOneToOne: false
            referencedRelation: "sa_detections"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_detections: {
        Row: {
          ai_confidence: number | null
          ai_verdict: string | null
          created_at: string
          extension_version: string | null
          id: string
          severity: string
          signals: Json
          url_hash: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_verdict?: string | null
          created_at?: string
          extension_version?: string | null
          id?: string
          severity: string
          signals?: Json
          url_hash: string
        }
        Update: {
          ai_confidence?: number | null
          ai_verdict?: string | null
          created_at?: string
          extension_version?: string | null
          id?: string
          severity?: string
          signals?: Json
          url_hash?: string
        }
        Relationships: []
      }
      sa_patterns: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          phrase: string
          severity_weight: number
          source: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          phrase: string
          severity_weight?: number
          source?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          phrase?: string
          severity_weight?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
