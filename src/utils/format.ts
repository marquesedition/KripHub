import type { AccessType } from '../types/domain';

export function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Sin expiración';
}

export function formatAccessType(type: AccessType | 'owner') {
  if (type === 'owner') {
    return 'Propia';
  }

  return type === 'temporary' ? 'Temporal' : 'Definitivo';
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
