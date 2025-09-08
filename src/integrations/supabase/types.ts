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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_article: boolean | null
          id: string
          image: string | null
          key_topics: string[] | null
          published_date: string | null
          sources: string | null
          status: string | null
          title: string | null
          trending_hashtags: string[] | null
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_article?: boolean | null
          id?: string
          image?: string | null
          key_topics?: string[] | null
          published_date?: string | null
          sources?: string | null
          status?: string | null
          title?: string | null
          trending_hashtags?: string[] | null
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_article?: boolean | null
          id?: string
          image?: string | null
          key_topics?: string[] | null
          published_date?: string | null
          sources?: string | null
          status?: string | null
          title?: string | null
          trending_hashtags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          blocked_reason: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          is_available: boolean
          max_capacity: number
          start_time: string
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          is_available?: boolean
          max_capacity?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_available?: boolean
          max_capacity?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      az_credits: {
        Row: {
          created_at: string | null
          delta: number
          id: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delta: number
          id?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delta?: number
          id?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      az_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      az_stripe_events: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          payload?: Json | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          type?: string | null
        }
        Relationships: []
      }
      az_usage_logs: {
        Row: {
          cached: boolean | null
          company: string | null
          cost_cents: number | null
          created_at: string | null
          id: number
          job_title: string | null
          provider: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          cached?: boolean | null
          company?: string | null
          cost_cents?: number | null
          created_at?: string | null
          id?: number
          job_title?: string | null
          provider: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          cached?: boolean | null
          company?: string | null
          cost_cents?: number | null
          created_at?: string | null
          id?: number
          job_title?: string | null
          provider?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_bookings: {
        Row: {
          availability_slot_id: string
          booking_notes: string | null
          booking_status: string
          created_at: string
          customer_order_id: string
          id: string
          scooper_assignment_id: string | null
          updated_at: string
        }
        Insert: {
          availability_slot_id: string
          booking_notes?: string | null
          booking_status?: string
          created_at?: string
          customer_order_id: string
          id?: string
          scooper_assignment_id?: string | null
          updated_at?: string
        }
        Update: {
          availability_slot_id?: string
          booking_notes?: string | null
          booking_status?: string
          created_at?: string
          customer_order_id?: string
          id?: string
          scooper_assignment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_bookings_availability_slot_id_fkey"
            columns: ["availability_slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_bookings_customer_order_id_fkey"
            columns: ["customer_order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_bookings_scooper_assignment_id_fkey"
            columns: ["scooper_assignment_id"]
            isOneToOne: false
            referencedRelation: "scooper_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          is_verified: boolean
          name: string
          phone: string
          updated_at: string
          verification_code: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          is_verified?: boolean
          name: string
          phone: string
          updated_at?: string
          verification_code: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_verified?: boolean
          name?: string
          phone?: string
          updated_at?: string
          verification_code?: string
        }
        Relationships: []
      }
      customer_orders: {
        Row: {
          add_ons: Json | null
          add_ons_price: number | null
          base_price: number
          commitment_months: number | null
          created_at: string
          customer_email: string
          customer_info_completed: boolean | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          dog_info: Json | null
          final_price: number
          id: string
          is_subscription: boolean | null
          next_service_date: string | null
          number_of_dogs: string
          payment_status: string | null
          preferred_days: string[] | null
          scheduled_date: string | null
          service_frequency: string
          service_start_date: string | null
          services_completed: number | null
          special_instructions: string | null
          special_notes: string | null
          street_address: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          time_slot: string | null
          total_price: number
          updated_at: string
          user_id: string | null
          yard_size: string
          zip_code: string
        }
        Insert: {
          add_ons?: Json | null
          add_ons_price?: number | null
          base_price: number
          commitment_months?: number | null
          created_at?: string
          customer_email: string
          customer_info_completed?: boolean | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          dog_info?: Json | null
          final_price: number
          id?: string
          is_subscription?: boolean | null
          next_service_date?: string | null
          number_of_dogs: string
          payment_status?: string | null
          preferred_days?: string[] | null
          scheduled_date?: string | null
          service_frequency: string
          service_start_date?: string | null
          services_completed?: number | null
          special_instructions?: string | null
          special_notes?: string | null
          street_address?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          time_slot?: string | null
          total_price: number
          updated_at?: string
          user_id?: string | null
          yard_size: string
          zip_code: string
        }
        Update: {
          add_ons?: Json | null
          add_ons_price?: number | null
          base_price?: number
          commitment_months?: number | null
          created_at?: string
          customer_email?: string
          customer_info_completed?: boolean | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          dog_info?: Json | null
          final_price?: number
          id?: string
          is_subscription?: boolean | null
          next_service_date?: string | null
          number_of_dogs?: string
          payment_status?: string | null
          preferred_days?: string[] | null
          scheduled_date?: string | null
          service_frequency?: string
          service_start_date?: string | null
          services_completed?: number | null
          special_instructions?: string | null
          special_notes?: string | null
          street_address?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          time_slot?: string | null
          total_price?: number
          updated_at?: string
          user_id?: string | null
          yard_size?: string
          zip_code?: string
        }
        Relationships: []
      }
      pa_analysis_cache: {
        Row: {
          cache_key: string
          result: string
          updated_at: string | null
        }
        Insert: {
          cache_key: string
          result: string
          updated_at?: string | null
        }
        Update: {
          cache_key?: string
          result?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pa_credits: {
        Row: {
          created_at: string | null
          delta: number
          id: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delta: number
          id?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delta?: number
          id?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pa_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pa_stripe_events: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          payload?: Json | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          type?: string | null
        }
        Relationships: []
      }
      pa_usage_logs: {
        Row: {
          cached: boolean | null
          company: string | null
          cost_cents: number | null
          created_at: string | null
          id: number
          job_title: string | null
          provider: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          cached?: boolean | null
          company?: string | null
          cost_cents?: number | null
          created_at?: string | null
          id?: number
          job_title?: string | null
          provider: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          cached?: boolean | null
          company?: string | null
          cost_cents?: number | null
          created_at?: string | null
          id?: number
          job_title?: string | null
          provider?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string
          created_at: string
          cuisine_type: string
          data_source: string | null
          description: string | null
          featured_items: string[] | null
          hours: Json | null
          id: string
          is_featured: boolean | null
          is_trending: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          photos: string[] | null
          price_range: number | null
          rating: number | null
          social_media: Json | null
          status: string | null
          total_reviews: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address: string
          created_at?: string
          cuisine_type: string
          data_source?: string | null
          description?: string | null
          featured_items?: string[] | null
          hours?: Json | null
          id?: string
          is_featured?: boolean | null
          is_trending?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          photos?: string[] | null
          price_range?: number | null
          rating?: number | null
          social_media?: Json | null
          status?: string | null
          total_reviews?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          cuisine_type?: string
          data_source?: string | null
          description?: string | null
          featured_items?: string[] | null
          hours?: Json | null
          id?: string
          is_featured?: boolean | null
          is_trending?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          photos?: string[] | null
          price_range?: number | null
          rating?: number | null
          social_media?: Json | null
          status?: string | null
          total_reviews?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      scooper_assignments: {
        Row: {
          availability_slot_id: string
          created_at: string
          id: string
          is_available: boolean
          notes: string | null
          scooper_name: string
          updated_at: string
        }
        Insert: {
          availability_slot_id: string
          created_at?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          scooper_name: string
          updated_at?: string
        }
        Update: {
          availability_slot_id?: string
          created_at?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          scooper_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scooper_assignments_availability_slot_id_fkey"
            columns: ["availability_slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      scoopers_articles: {
        Row: {
          author: string | null
          categories: string[] | null
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_article: boolean | null
          featured_image: string | null
          id: string
          location: string | null
          meta_description: string | null
          meta_keywords: string[] | null
          n8n_attempts: number | null
          n8n_last_error: string | null
          n8n_sent_at: string | null
          n8n_status: string | null
          photo_credit: string | null
          photo_source: string | null
          photo_source_url: string | null
          published_date: string | null
          read_time: number | null
          sent_to_n8n: boolean | null
          sent_to_zapier: boolean | null
          slug: string
          source_url: string | null
          sources: string | null
          status: string | null
          title: string
          updated_at: string
          video_thumbnail: string | null
          video_type: string | null
          video_url: string | null
          zapier_attempts: number | null
          zapier_last_error: string | null
          zapier_sent_at: string | null
          zapier_status: string | null
        }
        Insert: {
          author?: string | null
          categories?: string[] | null
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_article?: boolean | null
          featured_image?: string | null
          id?: string
          location?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          n8n_attempts?: number | null
          n8n_last_error?: string | null
          n8n_sent_at?: string | null
          n8n_status?: string | null
          photo_credit?: string | null
          photo_source?: string | null
          photo_source_url?: string | null
          published_date?: string | null
          read_time?: number | null
          sent_to_n8n?: boolean | null
          sent_to_zapier?: boolean | null
          slug: string
          source_url?: string | null
          sources?: string | null
          status?: string | null
          title: string
          updated_at?: string
          video_thumbnail?: string | null
          video_type?: string | null
          video_url?: string | null
          zapier_attempts?: number | null
          zapier_last_error?: string | null
          zapier_sent_at?: string | null
          zapier_status?: string | null
        }
        Update: {
          author?: string | null
          categories?: string[] | null
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_article?: boolean | null
          featured_image?: string | null
          id?: string
          location?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          n8n_attempts?: number | null
          n8n_last_error?: string | null
          n8n_sent_at?: string | null
          n8n_status?: string | null
          photo_credit?: string | null
          photo_source?: string | null
          photo_source_url?: string | null
          published_date?: string | null
          read_time?: number | null
          sent_to_n8n?: boolean | null
          sent_to_zapier?: boolean | null
          slug?: string
          source_url?: string | null
          sources?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          video_thumbnail?: string | null
          video_type?: string | null
          video_url?: string | null
          zapier_attempts?: number | null
          zapier_last_error?: string | null
          zapier_sent_at?: string | null
          zapier_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoopers_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "scoopers_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      scoopers_categories: {
        Row: {
          article_count: number | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          article_count?: number | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          article_count?: number | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      scoopers_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          meta_description: string | null
          meta_keywords: string[] | null
          slug: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
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
      az_get_my_balance: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      check_duplicate_order: {
        Args: {
          p_email: string
          p_number_of_dogs: string
          p_service_frequency: string
          p_yard_size: string
        }
        Returns: string
      }
      cleanup_expired_orders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_availability_slots: {
        Args: {
          end_date: string
          end_hour?: number
          start_date: string
          start_hour?: number
        }
        Returns: undefined
      }
      generate_slug: {
        Args: { title: string }
        Returns: string
      }
      generate_unique_slug: {
        Args: { title: string }
        Returns: string
      }
      has_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      pa_get_my_balance: {
        Args: Record<PropertyKey, never>
        Returns: number
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
