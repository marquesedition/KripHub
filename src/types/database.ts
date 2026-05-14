import type {
  AccessType,
  AccessCodeStatus,
  MediaType,
} from './domain';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nickname?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      media: {
        Row: {
          id: string;
          collection_id: string;
          owner_id: string;
          type: MediaType;
          title: string;
          encrypted_storage_path: string;
          thumbnail_encrypted_storage_path: string | null;
          encryption_version: number;
          nonce: string;
          auth_tag: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          owner_id: string;
          type: MediaType;
          title: string;
          encrypted_storage_path: string;
          thumbnail_encrypted_storage_path?: string | null;
          encryption_version?: number;
          nonce: string;
          auth_tag: string;
          size_bytes: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          collection_id?: string;
        };
        Relationships: [];
      };
      access_codes: {
        Row: {
          id: string;
          code_hash: string;
          owner_id: string;
          collection_id: string;
          access_type: AccessType;
          duration_minutes: number | null;
          starts_at: string;
          expires_at: string | null;
          max_uses: number | null;
          used_count: number;
          status: AccessCodeStatus;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          code_hash: string;
          owner_id: string;
          collection_id: string;
          access_type: AccessType;
          duration_minutes?: number | null;
          starts_at?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          used_count?: number;
          status?: AccessCodeStatus;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          status?: AccessCodeStatus;
          used_count?: number;
          revoked_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      access_sessions: {
        Row: {
          id: string;
          recipient_id: string;
          access_code_id: string;
          collection_id: string;
          owner_id: string;
          access_type: AccessType;
          starts_at: string;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          access_code_id: string;
          collection_id: string;
          owner_id: string;
          access_type: AccessType;
          starts_at?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      media_keys: {
        Row: {
          id: string;
          media_id: string;
          access_code_id: string;
          encrypted_media_key: string;
          key_encryption_version: number;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          media_id: string;
          access_code_id: string;
          encrypted_media_key: string;
          key_encryption_version?: number;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          actor_id: string | null;
          event_type: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          event_type: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      code_attempts: {
        Row: {
          id: string;
          user_id: string | null;
          code_hash: string | null;
          success: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          code_hash?: string | null;
          success?: boolean;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      access_type: AccessType;
      media_type: MediaType;
      access_code_status: AccessCodeStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
