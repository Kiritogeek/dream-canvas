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
      panels: {
        Row: {
          chapter_id: string
          color_blocks: Json | null
          created_at: string
          dialogue: string | null
          id: string
          image_url: string | null
          layout: Json | null
          motion_lines: Json | null
          narration: string | null
          panel_number: number
          prompt: string | null
          speech_bubbles: Json | null
          transition_effects: Json | null
          user_id: string
        }
        Insert: {
          chapter_id: string
          color_blocks?: Json | null
          created_at?: string
          dialogue?: string | null
          id?: string
          image_url?: string | null
          layout?: Json | null
          motion_lines?: Json | null
          narration?: string | null
          panel_number: number
          prompt?: string | null
          speech_bubbles?: Json | null
          transition_effects?: Json | null
          user_id: string
        }
        Update: {
          chapter_id?: string
          color_blocks?: Json | null
          created_at?: string
          dialogue?: string | null
          id?: string
          image_url?: string | null
          layout?: Json | null
          motion_lines?: Json | null
          narration?: string | null
          panel_number?: number
          prompt?: string | null
          speech_bubbles?: Json | null
          transition_effects?: Json | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          plan?: string
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
      projects: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          panels_target_per_chapter: number | null
          style_image_urls: string[]
          style_template: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          panels_target_per_chapter?: number | null
          style_image_urls?: string[]
          style_template?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          panels_target_per_chapter?: number | null
          style_image_urls?: string[]
          style_template?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
