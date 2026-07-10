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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account: {
        Row: {
          accessToken: string | null
          accessTokenExpiresAt: string | null
          accountId: string
          createdAt: string
          id: string
          idToken: string | null
          password: string | null
          providerId: string
          refreshToken: string | null
          refreshTokenExpiresAt: string | null
          scope: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          accessToken?: string | null
          accessTokenExpiresAt?: string | null
          accountId: string
          createdAt?: string
          id: string
          idToken?: string | null
          password?: string | null
          providerId: string
          refreshToken?: string | null
          refreshTokenExpiresAt?: string | null
          scope?: string | null
          updatedAt: string
          userId: string
        }
        Update: {
          accessToken?: string | null
          accessTokenExpiresAt?: string | null
          accountId?: string
          createdAt?: string
          id?: string
          idToken?: string | null
          password?: string | null
          providerId?: string
          refreshToken?: string | null
          refreshTokenExpiresAt?: string | null
          scope?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      corpus_chunks: {
        Row: {
          anno_imposta: number | null
          created_at: string
          documento_id: string
          embedding: string | null
          id: number
          pagina_a: number | null
          pagina_da: number | null
          percorso: string
          seq: number
          testo: string
          tsv: unknown
          vigenza_a: string | null
          vigenza_da: string | null
        }
        Insert: {
          anno_imposta?: number | null
          created_at?: string
          documento_id: string
          embedding?: string | null
          id?: never
          pagina_a?: number | null
          pagina_da?: number | null
          percorso: string
          seq: number
          testo: string
          tsv?: unknown
          vigenza_a?: string | null
          vigenza_da?: string | null
        }
        Update: {
          anno_imposta?: number | null
          created_at?: string
          documento_id?: string
          embedding?: string | null
          id?: never
          pagina_a?: number | null
          pagina_da?: number | null
          percorso?: string
          seq?: number
          testo?: string
          tsv?: unknown
          vigenza_a?: string | null
          vigenza_da?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corpus_chunks_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "corpus_documenti"
            referencedColumns: ["id"]
          },
        ]
      }
      corpus_citazioni: {
        Row: {
          approvata: boolean
          chunk_id: number
          created_at: string
          documento_citato_id: string | null
          id: number
          metodo: string
          riferimento: string
          testo_grezzo: string | null
          urn: string | null
        }
        Insert: {
          approvata?: boolean
          chunk_id: number
          created_at?: string
          documento_citato_id?: string | null
          id?: never
          metodo: string
          riferimento: string
          testo_grezzo?: string | null
          urn?: string | null
        }
        Update: {
          approvata?: boolean
          chunk_id?: number
          created_at?: string
          documento_citato_id?: string | null
          id?: never
          metodo?: string
          riferimento?: string
          testo_grezzo?: string | null
          urn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corpus_citazioni_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "corpus_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corpus_citazioni_documento_citato_id_fkey"
            columns: ["documento_citato_id"]
            isOneToOne: false
            referencedRelation: "corpus_documenti"
            referencedColumns: ["id"]
          },
        ]
      }
      corpus_documenti: {
        Row: {
          anno_imposta: number | null
          created_at: string
          data_pubblicazione: string | null
          estremi: string
          fonte: string
          hash_contenuto: string
          id: string
          identificativo: string
          tipo: string
          titolo: string | null
          updated_at: string
          url_origine: string
          verificato_il: string | null
          vigenza_a: string | null
          vigenza_da: string | null
        }
        Insert: {
          anno_imposta?: number | null
          created_at?: string
          data_pubblicazione?: string | null
          estremi: string
          fonte: string
          hash_contenuto: string
          id?: string
          identificativo: string
          tipo: string
          titolo?: string | null
          updated_at?: string
          url_origine: string
          verificato_il?: string | null
          vigenza_a?: string | null
          vigenza_da?: string | null
        }
        Update: {
          anno_imposta?: number | null
          created_at?: string
          data_pubblicazione?: string | null
          estremi?: string
          fonte?: string
          hash_contenuto?: string
          id?: string
          identificativo?: string
          tipo?: string
          titolo?: string | null
          updated_at?: string
          url_origine?: string
          verificato_il?: string | null
          vigenza_a?: string | null
          vigenza_da?: string | null
        }
        Relationships: []
      }
      corpus_ingestion_runs: {
        Row: {
          chunk_scritti: number
          cursore: Json | null
          documenti_aggiornati: number
          documenti_nuovi: number
          documenti_visti: number
          esito: string
          fonte: string
          id: number
          iniziata_il: string
          note: string | null
          terminata_il: string | null
        }
        Insert: {
          chunk_scritti?: number
          cursore?: Json | null
          documenti_aggiornati?: number
          documenti_nuovi?: number
          documenti_visti?: number
          esito?: string
          fonte: string
          id?: never
          iniziata_il?: string
          note?: string | null
          terminata_il?: string | null
        }
        Update: {
          chunk_scritti?: number
          cursore?: Json | null
          documenti_aggiornati?: number
          documenti_nuovi?: number
          documenti_visti?: number
          esito?: string
          fonte?: string
          id?: never
          iniziata_il?: string
          note?: string | null
          terminata_il?: string | null
        }
        Relationships: []
      }
      corpus_note_redazionali: {
        Row: {
          chunk_id: number
          created_at: string
          id: number
          modello: string | null
          stato: string
          testo: string
        }
        Insert: {
          chunk_id: number
          created_at?: string
          id?: never
          modello?: string | null
          stato?: string
          testo: string
        }
        Update: {
          chunk_id?: number
          created_at?: string
          id?: never
          modello?: string | null
          stato?: string
          testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "corpus_note_redazionali_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: true
            referencedRelation: "corpus_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          categoria: string
          contesto: string | null
          created_at: string
          id: number
          messaggio: string
          user_id: string
        }
        Insert: {
          categoria: string
          contesto?: string | null
          created_at?: string
          id?: never
          messaggio: string
          user_id: string
        }
        Update: {
          categoria?: string
          contesto?: string | null
          created_at?: string
          id?: never
          messaggio?: string
          user_id?: string
        }
        Relationships: []
      }
      oauthAccessToken: {
        Row: {
          accessToken: string
          accessTokenExpiresAt: string
          clientId: string
          createdAt: string
          id: string
          refreshToken: string
          refreshTokenExpiresAt: string
          scopes: string
          updatedAt: string
          userId: string | null
        }
        Insert: {
          accessToken: string
          accessTokenExpiresAt: string
          clientId: string
          createdAt: string
          id: string
          refreshToken: string
          refreshTokenExpiresAt: string
          scopes: string
          updatedAt: string
          userId?: string | null
        }
        Update: {
          accessToken?: string
          accessTokenExpiresAt?: string
          clientId?: string
          createdAt?: string
          id?: string
          refreshToken?: string
          refreshTokenExpiresAt?: string
          scopes?: string
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauthAccessToken_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "oauthApplication"
            referencedColumns: ["clientId"]
          },
          {
            foreignKeyName: "oauthAccessToken_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      oauthApplication: {
        Row: {
          clientId: string
          clientSecret: string | null
          createdAt: string
          disabled: boolean | null
          icon: string | null
          id: string
          metadata: string | null
          name: string
          redirectUrls: string
          type: string
          updatedAt: string
          userId: string | null
        }
        Insert: {
          clientId: string
          clientSecret?: string | null
          createdAt: string
          disabled?: boolean | null
          icon?: string | null
          id: string
          metadata?: string | null
          name: string
          redirectUrls: string
          type: string
          updatedAt: string
          userId?: string | null
        }
        Update: {
          clientId?: string
          clientSecret?: string | null
          createdAt?: string
          disabled?: boolean | null
          icon?: string | null
          id?: string
          metadata?: string | null
          name?: string
          redirectUrls?: string
          type?: string
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauthApplication_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      oauthConsent: {
        Row: {
          clientId: string
          consentGiven: boolean
          createdAt: string
          id: string
          scopes: string
          updatedAt: string
          userId: string
        }
        Insert: {
          clientId: string
          consentGiven: boolean
          createdAt: string
          id: string
          scopes: string
          updatedAt: string
          userId: string
        }
        Update: {
          clientId?: string
          consentGiven?: boolean
          createdAt?: string
          id?: string
          scopes?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauthConsent_clientId_fkey"
            columns: ["clientId"]
            isOneToOne: false
            referencedRelation: "oauthApplication"
            referencedColumns: ["clientId"]
          },
          {
            foreignKeyName: "oauthConsent_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      session: {
        Row: {
          createdAt: string
          expiresAt: string
          id: string
          ipAddress: string | null
          token: string
          updatedAt: string
          userAgent: string | null
          userId: string
        }
        Insert: {
          createdAt?: string
          expiresAt: string
          id: string
          ipAddress?: string | null
          token: string
          updatedAt: string
          userAgent?: string | null
          userId: string
        }
        Update: {
          createdAt?: string
          expiresAt?: string
          id?: string
          ipAddress?: string | null
          token?: string
          updatedAt?: string
          userAgent?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_events: {
        Row: {
          args_keys: string[] | null
          created_at: string
          id: number
          latency_ms: number | null
          outcome: string
          session_id: string | null
          tool: string
          user_id: string
        }
        Insert: {
          args_keys?: string[] | null
          created_at?: string
          id?: never
          latency_ms?: number | null
          outcome: string
          session_id?: string | null
          tool: string
          user_id: string
        }
        Update: {
          args_keys?: string[] | null
          created_at?: string
          id?: never
          latency_ms?: number | null
          outcome?: string
          session_id?: string | null
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      user: {
        Row: {
          createdAt: string
          email: string
          emailVerified: boolean
          id: string
          image: string | null
          name: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          email: string
          emailVerified: boolean
          id: string
          image?: string | null
          name: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          email?: string
          emailVerified?: boolean
          id?: string
          image?: string | null
          name?: string
          updatedAt?: string
        }
        Relationships: []
      }
      users_billing: {
        Row: {
          created_at: string
          daily_usage_count: number
          daily_usage_date: string
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_started_at: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_usage_count?: number
          daily_usage_date?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_started_at?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          daily_usage_count?: number
          daily_usage_date?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_started_at?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      verification: {
        Row: {
          createdAt: string
          expiresAt: string
          id: string
          identifier: string
          updatedAt: string
          value: string
        }
        Insert: {
          createdAt?: string
          expiresAt: string
          id: string
          identifier: string
          updatedAt?: string
          value: string
        }
        Update: {
          createdAt?: string
          expiresAt?: string
          id?: string
          identifier?: string
          updatedAt?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      corpus_hybrid_search: {
        Args: {
          filtro_anno?: number
          filtro_fonte?: string
          match_count?: number
          query_embedding: string
          query_text: string
          rrf_k?: number
        }
        Returns: {
          anno_imposta: number
          chunk_id: number
          documento_id: string
          estremi: string
          fonte: string
          nota_redazionale: string
          pagina_a: number
          pagina_da: number
          percorso: string
          score: number
          seq: number
          testo: string
          tipo: string
          titolo: string
          url_origine: string
          vigenza_a: string
          vigenza_da: string
        }[]
      }
      increment_usage: {
        Args: { p_user_id: string }
        Returns: {
          daily_usage_count: number
          plan: string
          usage_count: number
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

