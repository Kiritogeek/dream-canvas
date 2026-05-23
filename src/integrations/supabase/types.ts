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
      assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          created_at: string
          id: string
          image_url: string | null
          image_url_back: string | null
          image_url_profile_left: string | null
          image_url_profile_right: string | null
          image_url_sheet: string | null
          reference_image_url: string | null
          lore: string | null
          metadata: Json | null
          name: string
          project_id: string
          prompt: string | null
          user_id: string
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          created_at?: string
          id?: string
          image_url?: string | null
          image_url_back?: string | null
          image_url_profile_left?: string | null
          image_url_profile_right?: string | null
          image_url_sheet?: string | null
          reference_image_url?: string | null
          lore?: string | null
          metadata?: Json | null
          name: string
          project_id: string
          prompt?: string | null
          user_id: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          created_at?: string
          id?: string
          image_url?: string | null
          image_url_back?: string | null
          image_url_profile_left?: string | null
          image_url_profile_right?: string | null
          image_url_sheet?: string | null
          reference_image_url?: string | null
          lore?: string | null
          metadata?: Json | null
          name?: string
          project_id?: string
          prompt?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_number: number
          created_at: string
          id: string
          linked_scenario_chapter_id: string | null
          project_id: string
          synopsis: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_number?: number
          created_at?: string
          id?: string
          linked_scenario_chapter_id?: string | null
          project_id: string
          synopsis?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_number?: number
          created_at?: string
          id?: string
          linked_scenario_chapter_id?: string | null
          project_id?: string
          synopsis?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_linked_scenario_chapter_id_fkey"
            columns: ["linked_scenario_chapter_id"]
            isOneToOne: false
            referencedRelation: "scenario_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_canvases: {
        Row: {
          background_style: Json | null
          chapter_id: string
          color_blocks: Json | null
          created_at: string
          id: string
          layout: Json | null
          panel_number: number
          speech_bubbles: Json | null
          user_id: string
        }
        Insert: {
          background_style?: Json | null
          chapter_id: string
          color_blocks?: Json | null
          created_at?: string
          id?: string
          layout?: Json | null
          panel_number: number
          speech_bubbles?: Json | null
          user_id: string
        }
        Update: {
          background_style?: Json | null
          chapter_id?: string
          color_blocks?: Json | null
          created_at?: string
          id?: string
          layout?: Json | null
          panel_number?: number
          speech_bubbles?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panels_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_canvas_image_history: {
        Row: {
          id: string
          user_id: string
          chapter_id: string
          panel_canvas_id: string
          event_kind: "image_generated" | "case_removed_with_image"
          source_block_id: string
          prompt: string | null
          image_url: string
          block_name: string | null
          layout_rect: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          chapter_id: string
          panel_canvas_id: string
          event_kind: "image_generated" | "case_removed_with_image"
          source_block_id: string
          prompt?: string | null
          image_url: string
          block_name?: string | null
          layout_rect?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          chapter_id?: string
          panel_canvas_id?: string
          event_kind?: "image_generated" | "case_removed_with_image"
          source_block_id?: string
          prompt?: string | null
          image_url?: string
          block_name?: string | null
          layout_rect?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_canvas_image_history_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_canvas_image_history_panel_canvas_id_fkey"
            columns: ["panel_canvas_id"]
            isOneToOne: false
            referencedRelation: "chapter_canvases"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_entities: {
        Row: {
          asset_id: string | null
          created_at: string
          entity_type: string
          first_seen_chapter: number | null
          id: string
          last_seen_chapter: number | null
          lore_summary: string | null
          name: string
          project_id: string
          relations: Json
          token_estimate: number
          traits: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          entity_type: string
          first_seen_chapter?: number | null
          id?: string
          last_seen_chapter?: number | null
          lore_summary?: string | null
          name: string
          project_id: string
          relations?: Json
          token_estimate?: number
          traits?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          entity_type?: string
          first_seen_chapter?: number | null
          id?: string
          last_seen_chapter?: number | null
          lore_summary?: string | null
          name?: string
          project_id?: string
          relations?: Json
          token_estimate?: number
          traits?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_entities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_entities_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_summaries: {
        Row: {
          chapter_id: string | null
          chapter_number: number
          created_at: string
          id: string
          project_id: string
          summary: string
          token_estimate: number
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          chapter_number: number
          created_at?: string
          id?: string
          project_id: string
          summary: string
          token_estimate?: number
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          chapter_number?: number
          created_at?: string
          id?: string
          project_id?: string
          summary?: string
          token_estimate?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_summaries_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "scenario_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      narramind_alerts: {
        Row: {
          id: string
          user_id: string
          project_id: string
          chapter_id: string
          severity: string | null
          title: string
          explanation: string
          anchor: Json | null
          status: string
          dedupe_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          chapter_id: string
          severity?: string | null
          title: string
          explanation?: string
          anchor?: Json | null
          status?: string
          dedupe_key: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          chapter_id?: string
          severity?: string | null
          title?: string
          explanation?: string
          anchor?: Json | null
          status?: string
          dedupe_key?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "narramind_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narramind_alerts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "scenario_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      narramind_metrics: {
        Row: {
          anomalies_detected: number
          chapters_in_context: number | null
          chapter_number: number | null
          context_tokens: number | null
          created_at: string
          duration_ms: number | null
          id: string
          mode: string
          project_id: string
          response_tokens: number | null
        }
        Insert: {
          anomalies_detected?: number
          chapters_in_context?: number | null
          chapter_number?: number | null
          context_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          mode: string
          project_id: string
          response_tokens?: number | null
        }
        Update: {
          anomalies_detected?: number
          chapters_in_context?: number | null
          chapter_number?: number | null
          context_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          mode?: string
          project_id?: string
          response_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "narramind_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          billing_period_start: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          plan: string
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          billing_period_start?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          plan?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          billing_period_start?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          plan?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage: {
        Row: {
          id: string
          user_id: string
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          created_at?: string
        }
        Relationships: []
      }
      scenario_chapters: {
        Row: {
          id: string
          project_id: string
          user_id: string
          chapter_number: number
          title: string
          content: string | null
          panels_outline: Json | null
          ai_summary: string | null
          locked_blocks: Json | null
          word_mappings: Json | null
          narramind_anomalies: Json
          narramind_checked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          chapter_number?: number
          title: string
          content?: string | null
          panels_outline?: Json | null
          ai_summary?: string | null
          locked_blocks?: Json | null
          word_mappings?: Json | null
          narramind_anomalies?: Json
          narramind_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          chapter_number?: number
          title?: string
          content?: string | null
          panels_outline?: Json | null
          ai_summary?: string | null
          locked_blocks?: Json | null
          word_mappings?: Json | null
          narramind_anomalies?: Json
          narramind_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_chapters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_versions: {
        Row: {
          id: string
          project_id: string
          scenario_chapter_id: string | null
          user_id: string
          content: string
          version_type: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          scenario_chapter_id?: string | null
          user_id: string
          content: string
          version_type: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          scenario_chapter_id?: string | null
          user_id?: string
          content?: string
          version_type?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_versions_scenario_chapter_id_fkey"
            columns: ["scenario_chapter_id"]
            isOneToOne: false
            referencedRelation: "scenario_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      lore_nodes: {
        Row: {
          id: string
          project_id: string
          user_id: string
          type: string
          name: string
          description: string | null
          image_url: string | null
          asset_id: string | null
          chapter_id: string | null
          pos_x: number
          pos_y: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          type: string
          name: string
          description?: string | null
          image_url?: string | null
          asset_id?: string | null
          chapter_id?: string | null
          pos_x?: number
          pos_y?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          type?: string
          name?: string
          description?: string | null
          image_url?: string | null
          asset_id?: string | null
          chapter_id?: string | null
          pos_x?: number
          pos_y?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lore_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lore_nodes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lore_nodes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      lore_edges: {
        Row: {
          id: string
          project_id: string
          user_id: string
          from_node_id: string
          to_node_id: string
          label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          from_node_id: string
          to_node_id: string
          label?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          from_node_id?: string
          to_node_id?: string
          label?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lore_edges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lore_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "lore_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lore_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "lore_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      compass_proposals: {
        Row: {
          id: string
          project_id: string
          user_id: string
          source_id: string | null
          proposal_type: string
          origin: string
          title: string
          content: string
          prefill_data: Json | null
          status: string
          dedupe_key: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          source_id?: string | null
          proposal_type: string
          origin: string
          title: string
          content: string
          prefill_data?: Json | null
          status?: string
          dedupe_key: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          source_id?: string | null
          proposal_type?: string
          origin?: string
          title?: string
          content?: string
          prefill_data?: Json | null
          status?: string
          dedupe_key?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compass_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          narra_summary: string | null
          narra_summary_updated_at: string | null
          panels_target_per_chapter: number | null
          style_image_urls: string[]
          style_template: string | null
          title: string
          universe_lore: string | null
          updated_at: string
          user_id: string
          world_rules: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          narra_summary?: string | null
          narra_summary_updated_at?: string | null
          panels_target_per_chapter?: number | null
          style_image_urls?: string[]
          style_template?: string | null
          title: string
          universe_lore?: string | null
          updated_at?: string
          user_id: string
          world_rules?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          narra_summary?: string | null
          narra_summary_updated_at?: string | null
          panels_target_per_chapter?: number | null
          style_image_urls?: string[]
          style_template?: string | null
          title?: string
          universe_lore?: string | null
          updated_at?: string
          user_id?: string
          world_rules?: string | null
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
      asset_type: "character" | "background" | "object"
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
      asset_type: ["character", "background", "object"],
    },
  },
} as const
