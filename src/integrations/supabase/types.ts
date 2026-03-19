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
      az_pod_design_versions: {
        Row: {
          bg_hex: string | null
          color_name: string | null
          created_at: string | null
          id: string
          idea_id: string
          image_url: string
          is_selected: boolean | null
          product_type: string
          prompt: string | null
          version_number: number
        }
        Insert: {
          bg_hex?: string | null
          color_name?: string | null
          created_at?: string | null
          id?: string
          idea_id: string
          image_url: string
          is_selected?: boolean | null
          product_type: string
          prompt?: string | null
          version_number?: number
        }
        Update: {
          bg_hex?: string | null
          color_name?: string | null
          created_at?: string | null
          id?: string
          idea_id?: string
          image_url?: string
          is_selected?: boolean | null
          product_type?: string
          prompt?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "az_pod_design_versions_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "az_pod_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      az_pod_idea_labels: {
        Row: {
          idea_id: string
          label_id: string
        }
        Insert: {
          idea_id: string
          label_id: string
        }
        Update: {
          idea_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "az_pod_idea_labels_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "az_pod_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "az_pod_idea_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "az_pod_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      az_pod_idea_overrides: {
        Row: {
          created_at: string | null
          id: string
          idea_id: string
          shop_id: string | null
          sticker_margin_pct: number | null
          tshirt_color_overrides: Json | null
          tshirt_margin_pct: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          idea_id: string
          shop_id?: string | null
          sticker_margin_pct?: number | null
          tshirt_color_overrides?: Json | null
          tshirt_margin_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          idea_id?: string
          shop_id?: string | null
          sticker_margin_pct?: number | null
          tshirt_color_overrides?: Json | null
          tshirt_margin_pct?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "az_pod_idea_overrides_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "az_pod_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      az_pod_ideas: {
        Row: {
          analysis: Json | null
          created_at: string | null
          id: string
          idea_text: string | null
          image_url: string | null
          listing_platform: string | null
          listing_url: string | null
          notes: string | null
          printify_product_id: string | null
          printify_product_url: string | null
          priority: string | null
          product_type: string | null
          reject_reason: string | null
          status: string | null
          sticker_design_prompt: string | null
          sticker_design_url: string | null
          sticker_raw_url: string | null
          trello_card_id: string | null
          trello_card_url: string | null
          tshirt_design_prompt: string | null
          tshirt_design_url: string | null
          tshirt_raw_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string | null
          id?: string
          idea_text?: string | null
          image_url?: string | null
          listing_platform?: string | null
          listing_url?: string | null
          notes?: string | null
          printify_product_id?: string | null
          printify_product_url?: string | null
          priority?: string | null
          product_type?: string | null
          reject_reason?: string | null
          status?: string | null
          sticker_design_prompt?: string | null
          sticker_design_url?: string | null
          sticker_raw_url?: string | null
          trello_card_id?: string | null
          trello_card_url?: string | null
          tshirt_design_prompt?: string | null
          tshirt_design_url?: string | null
          tshirt_raw_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string | null
          id?: string
          idea_text?: string | null
          image_url?: string | null
          listing_platform?: string | null
          listing_url?: string | null
          notes?: string | null
          printify_product_id?: string | null
          printify_product_url?: string | null
          priority?: string | null
          product_type?: string | null
          reject_reason?: string | null
          status?: string | null
          sticker_design_prompt?: string | null
          sticker_design_url?: string | null
          sticker_raw_url?: string | null
          trello_card_id?: string | null
          trello_card_url?: string | null
          tshirt_design_prompt?: string | null
          tshirt_design_url?: string | null
          tshirt_raw_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      az_pod_labels: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      az_pod_listings: {
        Row: {
          created_at: string | null
          description: string
          ebay_title: string | null
          etsy_title: string | null
          id: string
          idea_id: string
          is_approved: boolean | null
          printify_blueprint_id: string | null
          printify_print_provider_id: string | null
          product_type: string
          seo_keywords: string[] | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          ebay_title?: string | null
          etsy_title?: string | null
          id?: string
          idea_id: string
          is_approved?: boolean | null
          printify_blueprint_id?: string | null
          printify_print_provider_id?: string | null
          product_type: string
          seo_keywords?: string[] | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          ebay_title?: string | null
          etsy_title?: string | null
          id?: string
          idea_id?: string
          is_approved?: boolean | null
          printify_blueprint_id?: string | null
          printify_print_provider_id?: string | null
          product_type?: string
          seo_keywords?: string[] | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "az_pod_listings_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "az_pod_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      az_pod_printify_shops: {
        Row: {
          auto_publish: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          marketplace: string
          shop_id: string
          sticker_margin_pct: number | null
          tshirt_margin_pct: number | null
          user_id: string
        }
        Insert: {
          auto_publish?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          marketplace?: string
          shop_id: string
          sticker_margin_pct?: number | null
          tshirt_margin_pct?: number | null
          user_id: string
        }
        Update: {
          auto_publish?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          marketplace?: string
          shop_id?: string
          sticker_margin_pct?: number | null
          tshirt_margin_pct?: number | null
          user_id?: string
        }
        Relationships: []
      }
      az_pod_settings: {
        Row: {
          auto_publish: boolean | null
          created_at: string | null
          id: string
          printify_api_key: string | null
          printify_shop_id: string | null
          removebg_api_key: string | null
          sticker_margin_pct: number | null
          trello_api_key: string | null
          trello_token: string | null
          tshirt_margin_pct: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_publish?: boolean | null
          created_at?: string | null
          id?: string
          printify_api_key?: string | null
          printify_shop_id?: string | null
          removebg_api_key?: string | null
          sticker_margin_pct?: number | null
          trello_api_key?: string | null
          trello_token?: string | null
          tshirt_margin_pct?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_publish?: boolean | null
          created_at?: string | null
          id?: string
          printify_api_key?: string | null
          printify_shop_id?: string | null
          removebg_api_key?: string | null
          sticker_margin_pct?: number | null
          trello_api_key?: string | null
          trello_token?: string | null
          tshirt_margin_pct?: number | null
          updated_at?: string | null
          user_id?: string
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
          detection_snapshot: Json | null
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
          detection_snapshot?: Json | null
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
          detection_snapshot?: Json | null
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
      sa_user_reports: {
        Row: {
          admin_notes: string | null
          ai_analysis: Json | null
          body_preview: string | null
          created_at: string | null
          description: string | null
          extension_version: string | null
          id: string
          indicators: Json | null
          promoted_pattern_id: string | null
          report_type: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scan_result: Json | null
          sender_email: string | null
          severity: string | null
          subject: string | null
          updated_at: string | null
          url: string
          user_notes: string | null
        }
        Insert: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          body_preview?: string | null
          created_at?: string | null
          description?: string | null
          extension_version?: string | null
          id?: string
          indicators?: Json | null
          promoted_pattern_id?: string | null
          report_type?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_result?: Json | null
          sender_email?: string | null
          severity?: string | null
          subject?: string | null
          updated_at?: string | null
          url: string
          user_notes?: string | null
        }
        Update: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          body_preview?: string | null
          created_at?: string | null
          description?: string | null
          extension_version?: string | null
          id?: string
          indicators?: Json | null
          promoted_pattern_id?: string | null
          report_type?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_result?: Json | null
          sender_email?: string | null
          severity?: string | null
          subject?: string | null
          updated_at?: string | null
          url?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sa_user_reports_promoted_pattern_id_fkey"
            columns: ["promoted_pattern_id"]
            isOneToOne: false
            referencedRelation: "sa_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      tb_licenses: {
        Row: {
          created_at: string | null
          email: string
          id: string
          status: string
          stripe_customer_id: string | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          tier?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_adjustment_history: {
        Args: { _limit?: number }
        Returns: {
          adjusted_by: string
          adjustment_reason: string
          admin_email: string
          correction_id: string
          created_at: string
          id: string
          new_weight: number
          old_weight: number
          pattern_phrase: string
          pattern_severity_weight: number
          phrase_id: string
        }[]
      }
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
