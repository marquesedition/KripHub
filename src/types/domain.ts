export type MediaType = 'image' | 'video';

export type AccessType = 'temporary' | 'permanent';

export type AccessCodeStatus = 'active' | 'used' | 'expired' | 'revoked';

export type Profile = {
  id: string;
  nickname: string;
  created_at: string;
  updated_at: string;
};

export type Collection = {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type GalleryCollection = Collection & {
  access_id: string | null;
  access_type: AccessType | 'owner';
  expires_at: string | null;
  is_owner: boolean;
  revoked_at: string | null;
};

export type Media = {
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

export type MediaKey = {
  id: string;
  media_id: string;
  access_code_id: string;
  encrypted_media_key: string;
  key_encryption_version: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type AccessCode = {
  id: string;
  owner_id: string;
  collection_id: string;
  access_type: AccessType;
  duration_minutes: number | null;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  status: AccessCodeStatus;
  created_at: string;
  revoked_at: string | null;
};

export type AccessSession = {
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
