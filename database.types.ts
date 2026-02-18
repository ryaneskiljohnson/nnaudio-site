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
      admins: {
        Row: {
          created_at: string | null
          id: number
          is_ad_manager: boolean | null
          user: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_ad_manager?: boolean | null
          user: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_ad_manager?: boolean | null
          user?: string
        }
        Relationships: []
      }
      automation_custom_fields: {
        Row: {
          created_at: string | null
          default_value: string | null
          description: string | null
          display_name: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          is_system_field: boolean | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          display_name: string
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          is_system_field?: boolean | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          display_name?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          is_system_field?: boolean | null
        }
        Relationships: []
      }
      automation_email_templates: {
        Row: {
          automation_id: string | null
          created_at: string | null
          emails_clicked: number | null
          emails_opened: number | null
          emails_sent: number | null
          html_content: string
          id: string
          is_variant: boolean | null
          name: string
          parent_template_id: string | null
          personalization_rules: Json | null
          subject: string
          text_content: string | null
          traffic_percentage: number | null
          updated_at: string | null
          variables: Json | null
          variant_name: string | null
        }
        Insert: {
          automation_id?: string | null
          created_at?: string | null
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          html_content: string
          id?: string
          is_variant?: boolean | null
          name: string
          parent_template_id?: string | null
          personalization_rules?: Json | null
          subject: string
          text_content?: string | null
          traffic_percentage?: number | null
          updated_at?: string | null
          variables?: Json | null
          variant_name?: string | null
        }
        Update: {
          automation_id?: string | null
          created_at?: string | null
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          html_content?: string
          id?: string
          is_variant?: boolean | null
          name?: string
          parent_template_id?: string | null
          personalization_rules?: Json | null
          subject?: string
          text_content?: string | null
          traffic_percentage?: number | null
          updated_at?: string | null
          variables?: Json | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_email_templates_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_enrollment_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_email_templates_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "email_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_email_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "automation_email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_jobs: {
        Row: {
          attempts: number | null
          automation_id: string | null
          completed_at: string | null
          created_at: string | null
          enrollment_id: string | null
          error_message: string | null
          id: string
          job_type: Database["public"]["Enums"]["automation_job_type"]
          max_attempts: number | null
          payload: Json
          priority: Database["public"]["Enums"]["job_priority"] | null
          result: Json | null
          scheduled_for: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          automation_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          job_type: Database["public"]["Enums"]["automation_job_type"]
          max_attempts?: number | null
          payload?: Json
          priority?: Database["public"]["Enums"]["job_priority"] | null
          result?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          automation_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["automation_job_type"]
          max_attempts?: number | null
          payload?: Json
          priority?: Database["public"]["Enums"]["job_priority"] | null
          result?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_jobs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_enrollment_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_jobs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "email_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_jobs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_automation_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_segment_members: {
        Row: {
          added_at: string | null
          calculated_at: string | null
          id: string
          segment_id: string | null
          subscriber_id: string | null
        }
        Insert: {
          added_at?: string | null
          calculated_at?: string | null
          id?: string
          segment_id?: string | null
          subscriber_id?: string | null
        }
        Update: {
          added_at?: string | null
          calculated_at?: string | null
          id?: string
          segment_id?: string | null
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "automation_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_segment_members_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_segment_members_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "automation_segment_members_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_segments: {
        Row: {
          auto_update: boolean | null
          cached_count: number | null
          calculation_in_progress: boolean | null
          conditions: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_dynamic: boolean | null
          last_calculated_at: string | null
          match_type: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          auto_update?: boolean | null
          cached_count?: number | null
          calculation_in_progress?: boolean | null
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          last_calculated_at?: string | null
          match_type?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          auto_update?: boolean | null
          cached_count?: number | null
          calculation_in_progress?: boolean | null
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          last_calculated_at?: string | null
          match_type?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      automation_step_executions: {
        Row: {
          automation_id: string | null
          completed_at: string | null
          enrollment_id: string | null
          error_message: string | null
          execution_result: Json | null
          id: string
          processing_time_ms: number | null
          retry_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          step_config: Json
          step_id: string
          step_index: number
          step_type: Database["public"]["Enums"]["automation_step_type"]
          subscriber_id: string | null
        }
        Insert: {
          automation_id?: string | null
          completed_at?: string | null
          enrollment_id?: string | null
          error_message?: string | null
          execution_result?: Json | null
          id?: string
          processing_time_ms?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          step_config: Json
          step_id: string
          step_index: number
          step_type: Database["public"]["Enums"]["automation_step_type"]
          subscriber_id?: string | null
        }
        Update: {
          automation_id?: string | null
          completed_at?: string | null
          enrollment_id?: string | null
          error_message?: string | null
          execution_result?: Json | null
          id?: string
          processing_time_ms?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          step_config?: Json
          step_id?: string
          step_index?: number
          step_type?: Database["public"]["Enums"]["automation_step_type"]
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_step_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_enrollment_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_step_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "email_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_step_executions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_automation_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_step_executions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_step_executions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "automation_step_executions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_subscriber_fields: {
        Row: {
          boolean_value: boolean | null
          date_value: string | null
          field_id: string | null
          id: string
          json_value: Json | null
          number_value: number | null
          subscriber_id: string | null
          text_value: string | null
          updated_at: string | null
        }
        Insert: {
          boolean_value?: boolean | null
          date_value?: string | null
          field_id?: string | null
          id?: string
          json_value?: Json | null
          number_value?: number | null
          subscriber_id?: string | null
          text_value?: string | null
          updated_at?: string | null
        }
        Update: {
          boolean_value?: boolean | null
          date_value?: string | null
          field_id?: string | null
          id?: string
          json_value?: Json | null
          number_value?: number | null
          subscriber_id?: string | null
          text_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_subscriber_fields_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "automation_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_subscriber_fields_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_subscriber_fields_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "automation_subscriber_fields_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_webhooks: {
        Row: {
          auth_config: Json | null
          auth_type: string | null
          consecutive_failures: number | null
          created_at: string | null
          created_by: string | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_called_at: string | null
          last_success_at: string | null
          method: string | null
          name: string
          retry_attempts: number | null
          retry_delay_seconds: number | null
          timeout_seconds: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          auth_config?: Json | null
          auth_type?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          created_by?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_called_at?: string | null
          last_success_at?: string | null
          method?: string | null
          name: string
          retry_attempts?: number | null
          retry_delay_seconds?: number | null
          timeout_seconds?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          auth_config?: Json | null
          auth_type?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          created_by?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_called_at?: string | null
          last_success_at?: string | null
          method?: string | null
          name?: string
          retry_attempts?: number | null
          retry_delay_seconds?: number | null
          timeout_seconds?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      bundle_products: {
        Row: {
          bundle_id: string
          created_at: string
          display_order: number | null
          id: string
          product_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          product_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_products_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_subscription_tiers: {
        Row: {
          active: boolean | null
          bundle_id: string
          created_at: string
          id: string
          price: number
          sale_price: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          subscription_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          bundle_id: string
          created_at?: string
          id?: string
          price: number
          sale_price?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          subscription_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          bundle_id?: string
          created_at?: string
          id?: string
          price?: number
          sale_price?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          subscription_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_subscription_tiers_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          background_image_url: string | null
          bundle_type: string
          created_at: string
          description: string | null
          display_order: number | null
          featured_image_url: string | null
          id: string
          is_featured: boolean | null
          logo_url: string | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          mosaic_image_url: string | null
          name: string
          short_description: string | null
          slug: string
          status: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          bundle_type: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          mosaic_image_url?: string | null
          name: string
          short_description?: string | null
          slug: string
          status?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          bundle_type?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          mosaic_image_url?: string | null
          name?: string
          short_description?: string | null
          slug?: string
          status?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_ab_test_results: {
        Row: {
          ab_test_id: string | null
          calculated_at: string | null
          id: string
          is_winner: boolean | null
          statistical_significance: number | null
          variant: string
        }
        Insert: {
          ab_test_id?: string | null
          calculated_at?: string | null
          id?: string
          is_winner?: boolean | null
          statistical_significance?: number | null
          variant: string
        }
        Update: {
          ab_test_id?: string | null
          calculated_at?: string | null
          id?: string
          is_winner?: boolean | null
          statistical_significance?: number | null
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ab_test_results_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "ab_test_performance"
            referencedColumns: ["test_id"]
          },
          {
            foreignKeyName: "email_ab_test_results_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "email_ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ab_test_variants: {
        Row: {
          ab_test_id: string | null
          content_variant: Json | null
          created_at: string | null
          id: string
          sender_email: string | null
          sender_name: string | null
          subject_line: string | null
          traffic_percentage: number
          variant_name: string
        }
        Insert: {
          ab_test_id?: string | null
          content_variant?: Json | null
          created_at?: string | null
          id?: string
          sender_email?: string | null
          sender_name?: string | null
          subject_line?: string | null
          traffic_percentage: number
          variant_name: string
        }
        Update: {
          ab_test_id?: string | null
          content_variant?: Json | null
          created_at?: string | null
          id?: string
          sender_email?: string | null
          sender_name?: string | null
          subject_line?: string | null
          traffic_percentage?: number
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ab_test_variants_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "ab_test_performance"
            referencedColumns: ["test_id"]
          },
          {
            foreignKeyName: "email_ab_test_variants_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "email_ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ab_tests: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          started_at: string | null
          status: string | null
          test_name: string
          test_type: string
          traffic_split: Json | null
          variants: Json
          winner_criteria: string | null
          winner_variant: string | null
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          test_name: string
          test_type: string
          traffic_split?: Json | null
          variants: Json
          winner_criteria?: string | null
          winner_variant?: string | null
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          test_name?: string
          test_type?: string
          traffic_split?: Json | null
          variants?: Json
          winner_criteria?: string | null
          winner_variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_audience_subscribers: {
        Row: {
          added_at: string | null
          audience_id: string | null
          id: string
          subscriber_id: string | null
        }
        Insert: {
          added_at?: string | null
          audience_id?: string | null
          id?: string
          subscriber_id?: string | null
        }
        Update: {
          added_at?: string | null
          audience_id?: string | null
          id?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_audience_subscribers_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audience_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_audience_subscribers_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audience_subscriber_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_audience_subscribers_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "email_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_audience_subscribers_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_audience_subscribers_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "email_audience_subscribers_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_audiences: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_dynamic: boolean | null
          name: string
          query_conditions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          name: string
          query_conditions: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          name?: string
          query_conditions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      email_automation_enrollments: {
        Row: {
          automation_id: string | null
          completed_at: string | null
          current_context: Json | null
          current_step_id: string | null
          current_step_index: number | null
          emails_clicked: number | null
          emails_opened: number | null
          emails_sent: number | null
          enrolled_at: string | null
          enrollment_data: Json | null
          id: string
          next_action_at: string | null
          paused_at: string | null
          status: Database["public"]["Enums"]["enrollment_status"] | null
          subscriber_id: string | null
        }
        Insert: {
          automation_id?: string | null
          completed_at?: string | null
          current_context?: Json | null
          current_step_id?: string | null
          current_step_index?: number | null
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          enrolled_at?: string | null
          enrollment_data?: Json | null
          id?: string
          next_action_at?: string | null
          paused_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          subscriber_id?: string | null
        }
        Update: {
          automation_id?: string | null
          completed_at?: string | null
          current_context?: Json | null
          current_step_id?: string | null
          current_step_index?: number | null
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          enrolled_at?: string | null
          enrollment_data?: Json | null
          id?: string
          next_action_at?: string | null
          paused_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_automation_enrollments_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_enrollment_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_automation_enrollments_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "email_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_automation_enrollments_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_automation_enrollments_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "email_automation_enrollments_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automations: {
        Row: {
          active_enrollments: number | null
          completed_enrollments: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          enrollment_limit_per_user: number | null
          id: string
          is_recurring: boolean | null
          max_enrollments: number | null
          name: string
          status: Database["public"]["Enums"]["automation_status"] | null
          total_enrollments: number | null
          trigger_conditions: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger_type"]
          updated_at: string | null
          workflow_definition: Json
        }
        Insert: {
          active_enrollments?: number | null
          completed_enrollments?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enrollment_limit_per_user?: number | null
          id?: string
          is_recurring?: boolean | null
          max_enrollments?: number | null
          name: string
          status?: Database["public"]["Enums"]["automation_status"] | null
          total_enrollments?: number | null
          trigger_conditions?: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger_type"]
          updated_at?: string | null
          workflow_definition?: Json
        }
        Update: {
          active_enrollments?: number | null
          completed_enrollments?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enrollment_limit_per_user?: number | null
          id?: string
          is_recurring?: boolean | null
          max_enrollments?: number | null
          name?: string
          status?: Database["public"]["Enums"]["automation_status"] | null
          total_enrollments?: number | null
          trigger_conditions?: Json
          trigger_type?: Database["public"]["Enums"]["automation_trigger_type"]
          updated_at?: string | null
          workflow_definition?: Json
        }
        Relationships: []
      }
      email_bounces: {
        Row: {
          bounce_reason: string | null
          bounce_subtype: string | null
          bounce_type: Database["public"]["Enums"]["bounce_type"]
          bounced_at: string | null
          campaign_id: string | null
          diagnostic_code: string | null
          id: string
          send_id: string | null
          subscriber_id: string | null
        }
        Insert: {
          bounce_reason?: string | null
          bounce_subtype?: string | null
          bounce_type: Database["public"]["Enums"]["bounce_type"]
          bounced_at?: string | null
          campaign_id?: string | null
          diagnostic_code?: string | null
          id?: string
          send_id?: string | null
          subscriber_id?: string | null
        }
        Update: {
          bounce_reason?: string | null
          bounce_subtype?: string | null
          bounce_type?: Database["public"]["Enums"]["bounce_type"]
          bounced_at?: string | null
          campaign_id?: string | null
          diagnostic_code?: string | null
          id?: string
          send_id?: string | null
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_bounces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_bounces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_bounces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_bounces_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_bounces_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_bounces_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "email_bounces_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_analytics: {
        Row: {
          browser: string | null
          campaign_id: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          event_type: string
          id: string
          operating_system: string | null
          region: string | null
          revenue: number | null
          subscriber_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_type: string
          id?: string
          operating_system?: string | null
          region?: string | null
          revenue?: number | null
          subscriber_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_type?: string
          id?: string
          operating_system?: string | null
          region?: string | null
          revenue?: number | null
          subscriber_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_analytics_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_analytics_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "email_campaign_analytics_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_audiences: {
        Row: {
          audience_id: string | null
          campaign_id: string | null
          created_at: string | null
          id: string
          is_excluded: boolean | null
        }
        Insert: {
          audience_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_excluded?: boolean | null
        }
        Update: {
          audience_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_excluded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_audiences_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audience_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_audiences_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audience_subscriber_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_audiences_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "email_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_audiences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_campaign_audiences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_audiences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_previews: {
        Row: {
          campaign_id: string | null
          device_type: string | null
          email_client: string | null
          expires_at: string | null
          generated_at: string | null
          generated_html: string | null
          id: string
          preview_type: string | null
          preview_url: string | null
        }
        Insert: {
          campaign_id?: string | null
          device_type?: string | null
          email_client?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generated_html?: string | null
          id?: string
          preview_type?: string | null
          preview_url?: string | null
        }
        Update: {
          campaign_id?: string | null
          device_type?: string | null
          email_client?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generated_html?: string | null
          id?: string
          preview_type?: string | null
          preview_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_previews_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_campaign_previews_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_previews_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_schedule_queue: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          retry_count: number | null
          scheduled_for: string
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for: string
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_schedule_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_campaign_schedule_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_schedule_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience_id: string | null
          created_at: string | null
          created_by: string | null
          emails_bounced: number | null
          emails_delivered: number | null
          emails_spam: number | null
          html_content: string | null
          id: string
          name: string
          preheader: string | null
          reply_to_email: string | null
          scheduled_at: string | null
          sender_email: string | null
          sender_name: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          subject: string
          template_id: string | null
          text_content: string | null
          updated_at: string | null
        }
        Insert: {
          audience_id?: string | null
          created_at?: string | null
          created_by?: string | null
          emails_bounced?: number | null
          emails_delivered?: number | null
          emails_spam?: number | null
          html_content?: string | null
          id?: string
          name: string
          preheader?: string | null
          reply_to_email?: string | null
          scheduled_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subject: string
          template_id?: string | null
          text_content?: string | null
          updated_at?: string | null
        }
        Update: {
          audience_id?: string | null
          created_at?: string | null
          created_by?: string | null
          emails_bounced?: number | null
          emails_delivered?: number | null
          emails_spam?: number | null
          html_content?: string | null
          id?: string
          name?: string
          preheader?: string | null
          reply_to_email?: string | null
          scheduled_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subject?: string
          template_id?: string | null
          text_content?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audience_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audience_subscriber_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "email_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      email_clicks: {
        Row: {
          campaign_id: string | null
          clicked_at: string
          id: string
          ip_address: unknown
          send_id: string | null
          subscriber_id: string | null
          url: string
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_clicks_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_clicks_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_clicks_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "email_clicks_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_clicks_2024_12: {
        Row: {
          campaign_id: string | null
          clicked_at: string
          id: string
          ip_address: unknown
          send_id: string | null
          subscriber_id: string | null
          url: string
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      email_clicks_2025_01: {
        Row: {
          campaign_id: string | null
          clicked_at: string
          id: string
          ip_address: unknown
          send_id: string | null
          subscriber_id: string | null
          url: string
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      email_clicks_2025_02: {
        Row: {
          campaign_id: string | null
          clicked_at: string
          id: string
          ip_address: unknown
          send_id: string | null
          subscriber_id: string | null
          url: string
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      email_clicks_default: {
        Row: {
          campaign_id: string | null
          clicked_at: string
          id: string
          ip_address: unknown
          send_id: string | null
          subscriber_id: string | null
          url: string
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string
          id?: string
          ip_address?: unknown
          send_id?: string | null
          subscriber_id?: string | null
          url?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      email_deliverability_settings: {
        Row: {
          bounce_handling_enabled: boolean | null
          click_tracking_enabled: boolean | null
          complaint_handling_enabled: boolean | null
          created_at: string | null
          custom_tracking_domain: string | null
          dkim_private_key: string | null
          dkim_selector: string | null
          domain: string
          id: string
          open_tracking_enabled: boolean | null
          unsubscribe_tracking_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          bounce_handling_enabled?: boolean | null
          click_tracking_enabled?: boolean | null
          complaint_handling_enabled?: boolean | null
          created_at?: string | null
          custom_tracking_domain?: string | null
          dkim_private_key?: string | null
          dkim_selector?: string | null
          domain: string
          id?: string
          open_tracking_enabled?: boolean | null
          unsubscribe_tracking_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          bounce_handling_enabled?: boolean | null
          click_tracking_enabled?: boolean | null
          complaint_handling_enabled?: boolean | null
          created_at?: string | null
          custom_tracking_domain?: string | null
          dkim_private_key?: string | null
          dkim_selector?: string | null
          domain?: string
          id?: string
          open_tracking_enabled?: boolean | null
          unsubscribe_tracking_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_domain_reputation: {
        Row: {
          blacklist_sources: string[] | null
          created_at: string | null
          dkim_status: string | null
          dmarc_status: string | null
          domain: string
          id: string
          is_blacklisted: boolean | null
          last_checked_at: string | null
          reputation_score: number | null
          spf_status: string | null
          updated_at: string | null
        }
        Insert: {
          blacklist_sources?: string[] | null
          created_at?: string | null
          dkim_status?: string | null
          dmarc_status?: string | null
          domain: string
          id?: string
          is_blacklisted?: boolean | null
          last_checked_at?: string | null
          reputation_score?: number | null
          spf_status?: string | null
          updated_at?: string | null
        }
        Update: {
          blacklist_sources?: string[] | null
          created_at?: string | null
          dkim_status?: string | null
          dmarc_status?: string | null
          domain?: string
          id?: string
          is_blacklisted?: boolean | null
          last_checked_at?: string | null
          reputation_score?: number | null
          spf_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_element_types: {
        Row: {
          created_at: string | null
          default_properties: Json | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          type_name: string
        }
        Insert: {
          created_at?: string | null
          default_properties?: Json | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          type_name: string
        }
        Update: {
          created_at?: string | null
          default_properties?: Json | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          type_name?: string
        }
        Relationships: []
      }
      email_list_growth: {
        Row: {
          bounces: number | null
          created_at: string | null
          date: string
          growth_rate: number | null
          id: string
          net_growth: number | null
          new_subscribers: number | null
          total_subscribers: number | null
          unsubscribes: number | null
        }
        Insert: {
          bounces?: number | null
          created_at?: string | null
          date: string
          growth_rate?: number | null
          id?: string
          net_growth?: number | null
          new_subscribers?: number | null
          total_subscribers?: number | null
          unsubscribes?: number | null
        }
        Update: {
          bounces?: number | null
          created_at?: string | null
          date?: string
          growth_rate?: number | null
          id?: string
          net_growth?: number | null
          new_subscribers?: number | null
          total_subscribers?: number | null
          unsubscribes?: number | null
        }
        Relationships: []
      }
      email_opens: {
        Row: {
          campaign_id: string | null
          id: string
          ip_address: unknown
          opened_at: string
          send_id: string | null
          subscriber_id: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_opens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_opens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_opens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_opens_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_opens_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_opens_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "email_opens_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_opens_2024_12: {
        Row: {
          campaign_id: string | null
          id: string
          ip_address: unknown
          opened_at: string
          send_id: string | null
          subscriber_id: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_opens_2025_01: {
        Row: {
          campaign_id: string | null
          id: string
          ip_address: unknown
          opened_at: string
          send_id: string | null
          subscriber_id: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_opens_2025_02: {
        Row: {
          campaign_id: string | null
          id: string
          ip_address: unknown
          opened_at: string
          send_id: string | null
          subscriber_id: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_opens_default: {
        Row: {
          campaign_id: string | null
          id: string
          ip_address: unknown
          opened_at: string
          send_id: string | null
          subscriber_id: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string
          send_id?: string | null
          subscriber_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_send_rate_limits: {
        Row: {
          created_at: string | null
          current_day_count: number | null
          current_hour_count: number | null
          emails_per_day: number
          emails_per_hour: number
          id: string
          is_active: boolean | null
          last_reset_day: string | null
          last_reset_hour: string | null
          provider: string
        }
        Insert: {
          created_at?: string | null
          current_day_count?: number | null
          current_hour_count?: number | null
          emails_per_day?: number
          emails_per_hour?: number
          id?: string
          is_active?: boolean | null
          last_reset_day?: string | null
          last_reset_hour?: string | null
          provider: string
        }
        Update: {
          created_at?: string | null
          current_day_count?: number | null
          current_hour_count?: number | null
          emails_per_day?: number
          emails_per_hour?: number
          id?: string
          is_active?: boolean | null
          last_reset_day?: string | null
          last_reset_hour?: string | null
          provider?: string
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          automation_id: string | null
          campaign_id: string | null
          delivered_at: string | null
          email_address: string
          error_message: string | null
          id: string
          message_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_send_status"] | null
          subscriber_id: string | null
        }
        Insert: {
          automation_id?: string | null
          campaign_id?: string | null
          delivered_at?: string | null
          email_address: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_send_status"] | null
          subscriber_id?: string | null
        }
        Update: {
          automation_id?: string | null
          campaign_id?: string | null
          delivered_at?: string | null
          email_address?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_send_status"] | null
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_enrollment_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "email_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "email_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_system_notifications: {
        Row: {
          created_at: string | null
          created_for: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          severity: Database["public"]["Enums"]["notification_severity"] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_for?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"] | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_for?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"] | null
          title?: string
        }
        Relationships: []
      }
      email_template_audiences: {
        Row: {
          audience_id: string
          created_at: string
          id: string
          is_excluded: boolean
          template_id: string
        }
        Insert: {
          audience_id: string
          created_at?: string
          id?: string
          is_excluded?: boolean
          template_id: string
        }
        Update: {
          audience_id?: string
          created_at?: string
          id?: string
          is_excluded?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_template_audiences_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audience_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_audiences_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audience_subscriber_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_audiences_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "email_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_audiences_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_audiences_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_clones: {
        Row: {
          clone_type: string | null
          cloned_by: string | null
          cloned_template_id: string | null
          created_at: string | null
          id: string
          original_template_id: string | null
        }
        Insert: {
          clone_type?: string | null
          cloned_by?: string | null
          cloned_template_id?: string | null
          created_at?: string | null
          id?: string
          original_template_id?: string | null
        }
        Update: {
          clone_type?: string | null
          cloned_by?: string | null
          cloned_template_id?: string | null
          created_at?: string | null
          id?: string
          original_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_template_clones_cloned_template_id_fkey"
            columns: ["cloned_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_clones_cloned_template_id_fkey"
            columns: ["cloned_template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_clones_original_template_id_fkey"
            columns: ["original_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_clones_original_template_id_fkey"
            columns: ["original_template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_favorites: {
        Row: {
          created_at: string | null
          id: string
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_template_favorites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_favorites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number | null
          review: string | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating?: number | null
          review?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number | null
          review?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_template_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          html_content: string | null
          id: string
          name: string
          template_id: string | null
          text_content: string | null
          variables: Json | null
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          html_content?: string | null
          id?: string
          name: string
          template_id?: string | null
          text_content?: string | null
          variables?: Json | null
          version_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          html_content?: string | null
          id?: string
          name?: string
          template_id?: string | null
          text_content?: string | null
          variables?: Json | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          html_content: string | null
          id: string
          last_used_at: string | null
          name: string
          status: Database["public"]["Enums"]["template_status"] | null
          subject: string | null
          template_type: Database["public"]["Enums"]["template_type"] | null
          text_content: string | null
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_content?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          status?: Database["public"]["Enums"]["template_status"] | null
          subject?: string | null
          template_type?: Database["public"]["Enums"]["template_type"] | null
          text_content?: string | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_content?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          status?: Database["public"]["Enums"]["template_status"] | null
          subject?: string | null
          template_type?: Database["public"]["Enums"]["template_type"] | null
          text_content?: string | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: []
      }
      email_test_sends: {
        Row: {
          campaign_id: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["email_send_status"] | null
          template_id: string | null
          test_email: string
        }
        Insert: {
          campaign_id?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["email_send_status"] | null
          template_id?: string | null
          test_email: string
        }
        Update: {
          campaign_id?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["email_send_status"] | null
          template_id?: string | null
          test_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_test_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_test_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_test_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_test_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_test_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribes: {
        Row: {
          campaign_id: string | null
          id: string
          reason: string | null
          send_id: string | null
          subscriber_id: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          reason?: string | null
          send_id?: string | null
          subscriber_id?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          id?: string
          reason?: string | null
          send_id?: string | null
          subscriber_id?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_unsubscribes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_unsubscribes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_unsubscribes_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_unsubscribes_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_unsubscribes_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "email_unsubscribes_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_webhook_logs: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          event_type: string
          id: string
          processed: boolean | null
          provider: string
          subscriber_id: string | null
          webhook_data: Json
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          processed?: boolean | null
          provider: string
          subscriber_id?: string | null
          webhook_data: Json
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          processed?: boolean | null
          provider?: string
          subscriber_id?: string | null
          webhook_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_webhook_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_webhook_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_webhook_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_webhook_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_engagement_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_webhook_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscriber_profiles"
            referencedColumns: ["subscriber_id"]
          },
          {
            foreignKeyName: "email_webhook_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      ios_subscriptions: {
        Row: {
          apple_validation_response: Json | null
          auto_renew_status: boolean | null
          created_at: string | null
          expires_date: string | null
          id: string
          is_active: boolean | null
          original_transaction_id: string | null
          product_id: string
          profile_id: string | null
          purchase_date: string | null
          receipt_data: string
          receipt_validated_at: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          transaction_id: string
          updated_at: string | null
          user_id: string
          validation_status: string
        }
        Insert: {
          apple_validation_response?: Json | null
          auto_renew_status?: boolean | null
          created_at?: string | null
          expires_date?: string | null
          id?: string
          is_active?: boolean | null
          original_transaction_id?: string | null
          product_id: string
          profile_id?: string | null
          purchase_date?: string | null
          receipt_data: string
          receipt_validated_at?: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          transaction_id: string
          updated_at?: string | null
          user_id: string
          validation_status: string
        }
        Update: {
          apple_validation_response?: Json | null
          auto_renew_status?: boolean | null
          created_at?: string | null
          expires_date?: string | null
          id?: string
          is_active?: boolean | null
          original_transaction_id?: string | null
          product_id?: string
          profile_id?: string | null
          purchase_date?: string | null
          receipt_data?: string
          receipt_validated_at?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          transaction_id?: string
          updated_at?: string | null
          user_id?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ios_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_conversion_events: {
        Row: {
          client_ip: unknown
          created_at: string | null
          custom_data: Json | null
          error_message: string | null
          event_id: string | null
          event_name: string
          id: string
          meta_response_id: string | null
          status: string
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          client_ip?: unknown
          created_at?: string | null
          custom_data?: Json | null
          error_message?: string | null
          event_id?: string | null
          event_name: string
          id?: string
          meta_response_id?: string | null
          status: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          client_ip?: unknown
          created_at?: string | null
          custom_data?: Json | null
          error_message?: string | null
          event_id?: string | null
          event_name?: string
          id?: string
          meta_response_id?: string | null
          status?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      playlist_videos: {
        Row: {
          condition_app_mode: string | null
          condition_musical_goal: string | null
          condition_tech_level: string | null
          condition_theory_level: string | null
          created_at: string | null
          id: string
          is_conditional: boolean | null
          is_optional: boolean | null
          playlist_id: string
          sequence_order: number
          video_id: string
        }
        Insert: {
          condition_app_mode?: string | null
          condition_musical_goal?: string | null
          condition_tech_level?: string | null
          condition_theory_level?: string | null
          created_at?: string | null
          id?: string
          is_conditional?: boolean | null
          is_optional?: boolean | null
          playlist_id: string
          sequence_order: number
          video_id: string
        }
        Update: {
          condition_app_mode?: string | null
          condition_musical_goal?: string | null
          condition_tech_level?: string | null
          condition_theory_level?: string | null
          created_at?: string | null
          id?: string
          is_conditional?: boolean | null
          is_optional?: boolean | null
          playlist_id?: string
          sequence_order?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_videos_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "tutorial_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      product_grants: {
        Row: {
          amount: number
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          product_id: string
          updated_at: string
          user_email: string
        }
        Insert: {
          amount?: number
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          updated_at?: string
          user_email: string
        }
        Update: {
          amount?: number
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_grants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_relationships: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          product_id: string
          related_product_id: string
          relationship_type: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id: string
          related_product_id: string
          relationship_type?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id?: string
          related_product_id?: string
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_relationships_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relationships_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          review_text: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          review_text?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          review_text?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          audio_samples: Json | null
          background_image_url: string | null
          background_video_url: string | null
          category: Database["public"]["Enums"]["product_category"]
          created_at: string | null
          demo_video_url: string | null
          demo_videos: Json | null
          description: string | null
          download_url: string | null
          download_version: string | null
          downloads: Json | null
          featured_image_url: string | null
          featured_image_url_png: string | null
          features: Json | null
          gallery_images: Json | null
          id: string
          is_featured: boolean | null
          legacy_product_id: string | null
          logo_url: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          price: number
          published_at: string | null
          purchase_count: number | null
          requirements: Json | null
          sale_price: number | null
          short_description: string | null
          slug: string
          specifications: Json | null
          status: Database["public"]["Enums"]["product_status"] | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_sale_price_id: string | null
          tagline: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          audio_samples?: Json | null
          background_image_url?: string | null
          background_video_url?: string | null
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string | null
          demo_video_url?: string | null
          demo_videos?: Json | null
          description?: string | null
          download_url?: string | null
          download_version?: string | null
          downloads?: Json | null
          featured_image_url?: string | null
          featured_image_url_png?: string | null
          features?: Json | null
          gallery_images?: Json | null
          id?: string
          is_featured?: boolean | null
          legacy_product_id?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          price: number
          published_at?: string | null
          purchase_count?: number | null
          requirements?: Json | null
          sale_price?: number | null
          short_description?: string | null
          slug: string
          specifications?: Json | null
          status?: Database["public"]["Enums"]["product_status"] | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_sale_price_id?: string | null
          tagline?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          audio_samples?: Json | null
          background_image_url?: string | null
          background_video_url?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string | null
          demo_video_url?: string | null
          demo_videos?: Json | null
          description?: string | null
          download_url?: string | null
          download_version?: string | null
          downloads?: Json | null
          featured_image_url?: string | null
          featured_image_url_png?: string | null
          features?: Json | null
          gallery_images?: Json | null
          id?: string
          is_featured?: boolean | null
          legacy_product_id?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          price?: number
          published_at?: string | null
          purchase_count?: number | null
          requirements?: Json | null
          sale_price?: number | null
          short_description?: string | null
          slug?: string
          specifications?: Json | null
          status?: Database["public"]["Enums"]["product_status"] | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_sale_price_id?: string | null
          tagline?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          customer_id: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          last_stripe_api_check: string | null
          subscription: Database["public"]["Enums"]["subscription_type"] | null
          subscription_expiration: string | null
          subscription_source: string | null
          trial_expiration: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          last_stripe_api_check?: string | null
          subscription?: Database["public"]["Enums"]["subscription_type"] | null
          subscription_expiration?: string | null
          subscription_source?: string | null
          trial_expiration?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          last_stripe_api_check?: string | null
          subscription?: Database["public"]["Enums"]["subscription_type"] | null
          subscription_expiration?: string | null
          subscription_source?: string | null
          trial_expiration?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          applicable_plans: string[] | null
          banner_theme: Json | null
          conversions: number | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          name: string
          priority: number | null
          revenue: number | null
          sale_price_annual: number | null
          sale_price_lifetime: number | null
          sale_price_monthly: number | null
          start_date: string | null
          stripe_coupon_code: string | null
          stripe_coupon_created: boolean | null
          stripe_coupon_id: string | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          active?: boolean
          applicable_plans?: string[] | null
          banner_theme?: Json | null
          conversions?: number | null
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          name: string
          priority?: number | null
          revenue?: number | null
          sale_price_annual?: number | null
          sale_price_lifetime?: number | null
          sale_price_monthly?: number | null
          start_date?: string | null
          stripe_coupon_code?: string | null
          stripe_coupon_created?: boolean | null
          stripe_coupon_id?: string | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          active?: boolean
          applicable_plans?: string[] | null
          banner_theme?: Json | null
          conversions?: number | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          name?: string
          priority?: number | null
          revenue?: number | null
          sale_price_annual?: number | null
          sale_price_lifetime?: number | null
          sale_price_monthly?: number | null
          start_date?: string | null
          stripe_coupon_code?: string | null
          stripe_coupon_created?: boolean | null
          stripe_coupon_id?: string | null
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      reseller_codes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          reseller_id: string
          serial_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          reseller_id: string
          serial_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          reseller_id?: string
          serial_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_codes_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          contact_info: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["reseller_status"]
          updated_at: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["reseller_status"]
          updated_at?: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["reseller_status"]
          updated_at?: string
        }
        Relationships: []
      }
      subscriber_imports: {
        Row: {
          created_at: string | null
          error_log: string | null
          failed_imports: number | null
          filename: string
          id: string
          import_status: string | null
          imported_by: string | null
          successful_imports: number | null
          total_rows: number
        }
        Insert: {
          created_at?: string | null
          error_log?: string | null
          failed_imports?: number | null
          filename: string
          id?: string
          import_status?: string | null
          imported_by?: string | null
          successful_imports?: number | null
          total_rows: number
        }
        Update: {
          created_at?: string | null
          error_log?: string | null
          failed_imports?: number | null
          filename?: string
          id?: string
          import_status?: string | null
          imported_by?: string | null
          successful_imports?: number | null
          total_rows?: number
        }
        Relationships: []
      }
      subscriber_tags: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          bounce_reason: string | null
          bounced_at: string | null
          complained_at: string | null
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          preferences: Json | null
          source: string | null
          status: Database["public"]["Enums"]["subscriber_status"] | null
          subscribe_date: string | null
          tags: string[] | null
          unsubscribe_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bounce_reason?: string | null
          bounced_at?: string | null
          complained_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          preferences?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["subscriber_status"] | null
          subscribe_date?: string | null
          tags?: string[] | null
          unsubscribe_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bounce_reason?: string | null
          bounced_at?: string | null
          complained_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          preferences?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["subscriber_status"] | null
          subscribe_date?: string | null
          tags?: string[] | null
          unsubscribe_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_attachments: {
        Row: {
          attachment_type: Database["public"]["Enums"]["attachment_type"]
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string
          storage_path: string
          url: string | null
        }
        Insert: {
          attachment_type: Database["public"]["Enums"]["attachment_type"]
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id: string
          storage_path: string
          url?: string | null
        }
        Update: {
          attachment_type?: Database["public"]["Enums"]["attachment_type"]
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
          storage_path?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_admin: boolean
          message_type: Database["public"]["Enums"]["message_type"]
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_admin?: boolean
          message_type?: Database["public"]["Enums"]["message_type"]
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_admin?: boolean
          message_type?: Database["public"]["Enums"]["message_type"]
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactional_email_templates: {
        Row: {
          created_at: string | null
          fallback_template_id: string | null
          id: string
          is_active: boolean | null
          template_id: string | null
          template_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fallback_template_id?: string | null
          id?: string
          is_active?: boolean | null
          template_id?: string | null
          template_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fallback_template_id?: string | null
          id?: string
          is_active?: boolean | null
          template_id?: string | null
          template_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactional_email_templates_fallback_template_id_fkey"
            columns: ["fallback_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactional_email_templates_fallback_template_id_fkey"
            columns: ["fallback_template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactional_email_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactional_email_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_playlists: {
        Row: {
          app_mode_filter: string
          created_at: string | null
          description: string | null
          difficulty_rating: number | null
          estimated_duration: number | null
          id: string
          musical_goal: string
          name: string
          target_tech_level: string
          target_theory_level: string
          updated_at: string | null
        }
        Insert: {
          app_mode_filter: string
          created_at?: string | null
          description?: string | null
          difficulty_rating?: number | null
          estimated_duration?: number | null
          id?: string
          musical_goal: string
          name: string
          target_tech_level: string
          target_theory_level: string
          updated_at?: string | null
        }
        Update: {
          app_mode_filter?: string
          created_at?: string | null
          description?: string | null
          difficulty_rating?: number | null
          estimated_duration?: number | null
          id?: string
          musical_goal?: string
          name?: string
          target_tech_level?: string
          target_theory_level?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tutorial_videos: {
        Row: {
          app_mode_applicability: string
          component_source_file: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          feature_category: string
          id: string
          musical_context: string
          tech_level_required: string
          theory_level_required: string
          title: string
          updated_at: string | null
          video_order: number | null
          youtube_duration_cache_version: number | null
          youtube_duration_cached: number | null
          youtube_duration_last_updated: string | null
          youtube_video_id: string | null
        }
        Insert: {
          app_mode_applicability: string
          component_source_file?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          feature_category: string
          id?: string
          musical_context: string
          tech_level_required: string
          theory_level_required: string
          title: string
          updated_at?: string | null
          video_order?: number | null
          youtube_duration_cache_version?: number | null
          youtube_duration_cached?: number | null
          youtube_duration_last_updated?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          app_mode_applicability?: string
          component_source_file?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          feature_category?: string
          id?: string
          musical_context?: string
          tech_level_required?: string
          theory_level_required?: string
          title?: string
          updated_at?: string | null
          video_order?: number | null
          youtube_duration_cache_version?: number | null
          youtube_duration_cached?: number | null
          youtube_duration_last_updated?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      user_management: {
        Row: {
          active: boolean
          notes: string | null
          pro: boolean
          user_email: string
        }
        Insert: {
          active?: boolean
          notes?: string | null
          pro?: boolean
          user_email: string
        }
        Update: {
          active?: boolean
          notes?: string | null
          pro?: boolean
          user_email?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          aal: string | null
          created_at: string | null
          factor_id: string | null
          id: string
          ip: unknown
          not_after: string | null
          refreshed_at: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aal?: string | null
          created_at?: string | null
          factor_id?: string | null
          id: string
          ip?: unknown
          not_after?: string | null
          refreshed_at?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aal?: string | null
          created_at?: string | null
          factor_id?: string | null
          id?: string
          ip?: unknown
          not_after?: string | null
          refreshed_at?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tutorial_paths: {
        Row: {
          app_mode: string
          created_at: string | null
          generated_playlist_id: string | null
          id: string
          musical_goals: string[] | null
          prior_experience: string | null
          progress_data: Json | null
          tech_level: string
          theory_level: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_mode: string
          created_at?: string | null
          generated_playlist_id?: string | null
          id?: string
          musical_goals?: string[] | null
          prior_experience?: string | null
          progress_data?: Json | null
          tech_level: string
          theory_level: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_mode?: string
          created_at?: string | null
          generated_playlist_id?: string | null
          id?: string
          musical_goals?: string[] | null
          prior_experience?: string | null
          progress_data?: Json | null
          tech_level?: string
          theory_level?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tutorial_paths_generated_playlist_id_fkey"
            columns: ["generated_playlist_id"]
            isOneToOne: false
            referencedRelation: "tutorial_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean | null
          last_watched_at: string | null
          playlist_id: string | null
          total_watch_time: number | null
          updated_at: string | null
          user_id: string | null
          video_id: string | null
          watch_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          playlist_id?: string | null
          total_watch_time?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
          watch_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          playlist_id?: string | null
          total_watch_time?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
          watch_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "tutorial_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_relationships: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          related_video_id: string
          relationship_strength: number | null
          relationship_type: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          related_video_id: string
          relationship_strength?: number | null
          relationship_type: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          related_video_id?: string
          relationship_strength?: number | null
          relationship_type?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_relationships_related_video_id_fkey"
            columns: ["related_video_id"]
            isOneToOne: false
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_relationships_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_scripts: {
        Row: {
          created_at: string | null
          demonstration: string | null
          explanation: string | null
          hook: string | null
          id: string
          last_updated: string | null
          location: string | null
          practice: string | null
          related: string | null
          script_content: string
          source_references: string | null
          video_id: string
        }
        Insert: {
          created_at?: string | null
          demonstration?: string | null
          explanation?: string | null
          hook?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          practice?: string | null
          related?: string | null
          script_content: string
          source_references?: string | null
          video_id: string
        }
        Update: {
          created_at?: string | null
          demonstration?: string | null
          explanation?: string | null
          hook?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          practice?: string | null
          related?: string | null
          script_content?: string
          source_references?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_scripts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ab_test_performance: {
        Row: {
          click_rate: number | null
          conversion_rate: number | null
          is_winner: boolean | null
          open_rate: number | null
          statistical_significance: number | null
          status: string | null
          test_id: string | null
          test_name: string | null
          test_type: string | null
          total_clicks: number | null
          total_conversions: number | null
          total_opens: number | null
          total_sent: number | null
          variant: string | null
        }
        Relationships: []
      }
      audience_insights: {
        Row: {
          active_rate: number | null
          active_subscribers: number | null
          annual_subscribers: number | null
          created_at: string | null
          description: string | null
          free_users: number | null
          high_engagement: number | null
          id: string | null
          is_dynamic: boolean | null
          lifetime_members: number | null
          low_engagement: number | null
          medium_engagement: number | null
          monthly_subscribers: number | null
          name: string | null
          paid_subscriber_rate: number | null
          total_subscribers: number | null
          trial_users: number | null
        }
        Relationships: []
      }
      audience_subscriber_counts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_dynamic: boolean | null
          last_calculated_at: string | null
          name: string | null
          subscriber_count: number | null
        }
        Relationships: []
      }
      automation_enrollment_stats: {
        Row: {
          active_enrolled: number | null
          completion_rate: number | null
          created_at: string | null
          id: string | null
          name: string | null
          status: Database["public"]["Enums"]["automation_status"] | null
          total_completed: number | null
          total_enrolled: number | null
          trigger_type:
            | Database["public"]["Enums"]["automation_trigger_type"]
            | null
        }
        Relationships: []
      }
      campaign_performance: {
        Row: {
          bounce_rate: number | null
          campaign_id: string | null
          click_rate: number | null
          name: string | null
          open_rate: number | null
          revenue_generated: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          total_bounces: number | null
          total_clicks: number | null
          total_delivered: number | null
          total_opens: number | null
          total_recipients: number | null
          total_sent: number | null
          total_spam_reports: number | null
          total_unsubscribes: number | null
          unsubscribe_rate: number | null
        }
        Relationships: []
      }
      campaign_performance_summary: {
        Row: {
          bounce_rate: number | null
          click_rate: number | null
          id: string | null
          name: string | null
          open_rate: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          total_bounces: number | null
          total_clicks: number | null
          total_delivered: number | null
          total_opens: number | null
          total_sent: number | null
        }
        Relationships: []
      }
      domain_reputation_stats: {
        Row: {
          delivery_rate: number | null
          dkim_status: string | null
          dmarc_status: string | null
          domain: string | null
          id: string | null
          is_blacklisted: boolean | null
          last_checked_at: string | null
          reputation_score: number | null
          spf_status: string | null
          total_bounced: number | null
          total_delivered: number | null
          total_sent: number | null
          total_spam_reports: number | null
        }
        Relationships: []
      }
      subscriber_engagement_summary: {
        Row: {
          email: string | null
          engagement_level_30d: string | null
          id: string | null
          last_engagement: string | null
          status: Database["public"]["Enums"]["subscriber_status"] | null
          total_clicks_30d: number | null
          total_emails_received_30d: number | null
          total_opens_30d: number | null
        }
        Relationships: []
      }
      subscriber_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          customer_id: string | null
          email: string | null
          engagement_level: string | null
          first_name: string | null
          last_engagement_date: string | null
          last_name: string | null
          metadata: Json | null
          preferences: Json | null
          profile_updated_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["subscriber_status"] | null
          subscribe_date: string | null
          subscriber_id: string | null
          subscription: Database["public"]["Enums"]["subscription_type"] | null
          subscription_expiration: string | null
          tags: string[] | null
          total_clicks: number | null
          total_opens: number | null
          trial_expiration: string | null
          unsubscribe_date: string | null
          updated_at: string | null
          user_created_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      subscriber_tag_counts: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          subscriber_count: number | null
        }
        Relationships: []
      }
      template_usage_stats: {
        Row: {
          avg_rating: number | null
          created_at: string | null
          favorite_count: number | null
          id: string | null
          last_used_at: string | null
          name: string | null
          status: Database["public"]["Enums"]["template_status"] | null
          template_type: Database["public"]["Enums"]["template_type"] | null
          total_ratings: number | null
          usage_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_subscriber_to_audience: {
        Args: { p_audience_id: string; p_subscriber_id: string }
        Returns: boolean
      }
      archive_old_email_data: {
        Args: { archive_before_date?: string }
        Returns: number
      }
      bulk_import_users: {
        Args: { p_users: Json }
        Returns: {
          inserted: number
          skipped: number
        }[]
      }
      calculate_daily_list_growth: {
        Args: { target_date?: string }
        Returns: undefined
      }
      check_send_rate_limit: {
        Args: { emails_to_send?: number; provider_name: string }
        Returns: boolean
      }
      cleanup_automation_data: {
        Args: { p_days_to_keep?: number }
        Returns: {
          events_deleted: number
          jobs_deleted: number
          logs_deleted: number
        }[]
      }
      complete_automation_job: {
        Args: {
          p_error_message?: string
          p_job_id: string
          p_result?: Json
          p_status: Database["public"]["Enums"]["job_status"]
        }
        Returns: undefined
      }
      create_automation_event: {
        Args: {
          p_campaign_id?: string
          p_event_data?: Json
          p_event_type: string
          p_subscriber_id?: string
          p_user_id?: string
        }
        Returns: string
      }
      create_automation_partitions: { Args: never; Returns: undefined }
      create_monthly_partitions: {
        Args: { months_ahead?: number; table_name: string }
        Returns: undefined
      }
      enroll_subscriber_in_automation: {
        Args: {
          p_automation_id: string
          p_enrollment_data?: Json
          p_subscriber_id: string
        }
        Returns: string
      }
      generate_ticket_number: { Args: never; Returns: string }
      get_active_ios_subscription: {
        Args: { p_user_id: string }
        Returns: {
          expires_date: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          transaction_id: string
        }[]
      }
      get_active_promotion: {
        Args: { plan_type: string }
        Returns: {
          banner_theme: Json
          description: string
          discount_type: string
          discount_value: number
          id: string
          name: string
          sale_price: number
          stripe_coupon_code: string
          title: string
        }[]
      }
      get_admin_grant_orders_paginated: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_page?: number
          p_search?: string
        }
        Returns: Json
      }
      get_bundle_total_value: { Args: { bundle_uuid: string }; Returns: number }
      get_campaign_performance_summary: {
        Args: never
        Returns: {
          bounce_rate: number
          click_rate: number
          id: string
          name: string
          open_rate: number
          sent_at: string
          status: Database["public"]["Enums"]["campaign_status"]
          total_bounces: number
          total_clicks: number
          total_delivered: number
          total_opens: number
          total_sent: number
        }[]
      }
      get_next_automation_job: {
        Args: never
        Returns: {
          automation_id: string
          enrollment_id: string
          job_id: string
          job_type: Database["public"]["Enums"]["automation_job_type"]
          payload: Json
          priority: Database["public"]["Enums"]["job_priority"]
        }[]
      }
      get_subscriber_engagement_summary: {
        Args: never
        Returns: {
          email: string
          engagement_level_30d: string
          id: string
          last_engagement: string
          status: Database["public"]["Enums"]["subscriber_status"]
          total_clicks_30d: number
          total_emails_received_30d: number
          total_opens_30d: number
        }[]
      }
      increment_campaign_bounced: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_campaign_delivered: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_campaign_spam: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_enrollment_emails_sent: {
        Args: { enrollment_id: string }
        Returns: undefined
      }
      increment_promotion_conversion: {
        Args: { conversion_value?: number; promotion_id: string }
        Returns: undefined
      }
      increment_promotion_view: {
        Args: { promotion_id: string }
        Returns: undefined
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      refresh_engagement_summary: { Args: never; Returns: undefined }
      remove_subscriber_from_audience: {
        Args: { p_audience_id: string; p_subscriber_id: string }
        Returns: boolean
      }
      schedule_automation_job: {
        Args: {
          p_automation_id?: string
          p_enrollment_id?: string
          p_job_type: Database["public"]["Enums"]["automation_job_type"]
          p_payload: Json
          p_priority?: Database["public"]["Enums"]["job_priority"]
          p_scheduled_for?: string
        }
        Returns: string
      }
    }
    Enums: {
      attachment_type: "image" | "video" | "document" | "audio" | "other"
      automation_job_type:
        | "trigger_check"
        | "enrollment_process"
        | "step_execution"
        | "delay_completion"
        | "condition_evaluation"
        | "email_send"
        | "webhook_call"
        | "cleanup"
        | "analytics_update"
      automation_status: "draft" | "active" | "paused" | "archived" | "testing"
      automation_step_type:
        | "email"
        | "delay"
        | "condition"
        | "action"
        | "webhook"
        | "tag_add"
        | "tag_remove"
        | "segment_add"
        | "segment_remove"
        | "custom_field_update"
      automation_trigger:
        | "signup"
        | "purchase"
        | "abandonment"
        | "anniversary"
        | "behavior"
        | "custom"
      automation_trigger_type:
        | "signup"
        | "purchase"
        | "abandonment"
        | "anniversary"
        | "behavior"
        | "date_based"
        | "segment_entry"
        | "segment_exit"
        | "custom_event"
        | "email_open"
        | "email_click"
        | "website_visit"
        | "subscription_change"
      bounce_type: "hard" | "soft" | "complaint"
      campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "paused"
        | "failed"
      email_send_status: "pending" | "sent" | "delivered" | "bounced" | "failed"
      enrollment_status:
        | "active"
        | "completed"
        | "paused"
        | "cancelled"
        | "failed"
      job_priority: "low" | "medium" | "high" | "urgent"
      job_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      message_type: "text" | "system"
      notification_severity: "info" | "warning" | "error" | "critical"
      product_category:
        | "plugin"
        | "pack"
        | "bundle"
        | "preset"
        | "template"
        | "application"
        | "audio-fx-plugin"
        | "instrument-plugin"
        | "midi-fx-plugin"
      product_status: "draft" | "active" | "inactive" | "archived"
      reseller_status: "active" | "suspended" | "deleted"
      subscriber_status:
        | "active"
        | "unsubscribed"
        | "bounced"
        | "pending"
        | "complained"
      subscription_type: "none" | "monthly" | "annual" | "lifetime" | "admin"
      template_status: "draft" | "active" | "archived"
      template_type:
        | "welcome"
        | "newsletter"
        | "promotional"
        | "transactional"
        | "custom"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
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
      attachment_type: ["image", "video", "document", "audio", "other"],
      automation_job_type: [
        "trigger_check",
        "enrollment_process",
        "step_execution",
        "delay_completion",
        "condition_evaluation",
        "email_send",
        "webhook_call",
        "cleanup",
        "analytics_update",
      ],
      automation_status: ["draft", "active", "paused", "archived", "testing"],
      automation_step_type: [
        "email",
        "delay",
        "condition",
        "action",
        "webhook",
        "tag_add",
        "tag_remove",
        "segment_add",
        "segment_remove",
        "custom_field_update",
      ],
      automation_trigger: [
        "signup",
        "purchase",
        "abandonment",
        "anniversary",
        "behavior",
        "custom",
      ],
      automation_trigger_type: [
        "signup",
        "purchase",
        "abandonment",
        "anniversary",
        "behavior",
        "date_based",
        "segment_entry",
        "segment_exit",
        "custom_event",
        "email_open",
        "email_click",
        "website_visit",
        "subscription_change",
      ],
      bounce_type: ["hard", "soft", "complaint"],
      campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "paused",
        "failed",
      ],
      email_send_status: ["pending", "sent", "delivered", "bounced", "failed"],
      enrollment_status: [
        "active",
        "completed",
        "paused",
        "cancelled",
        "failed",
      ],
      job_priority: ["low", "medium", "high", "urgent"],
      job_status: ["pending", "processing", "completed", "failed", "cancelled"],
      message_type: ["text", "system"],
      notification_severity: ["info", "warning", "error", "critical"],
      product_category: [
        "plugin",
        "pack",
        "bundle",
        "preset",
        "template",
        "application",
        "audio-fx-plugin",
        "instrument-plugin",
        "midi-fx-plugin",
      ],
      product_status: ["draft", "active", "inactive", "archived"],
      reseller_status: ["active", "suspended", "deleted"],
      subscriber_status: [
        "active",
        "unsubscribed",
        "bounced",
        "pending",
        "complained",
      ],
      subscription_type: ["none", "monthly", "annual", "lifetime", "admin"],
      template_status: ["draft", "active", "archived"],
      template_type: [
        "welcome",
        "newsletter",
        "promotional",
        "transactional",
        "custom",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const

