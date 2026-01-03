/**
 * Shared type definitions for the Access page
 */

export type AccessMode = 'login' | 'exploit';

export interface VaultCredential {
  id: number;
  host: string;
  hostname?: string;
  protocol: string;
  username: string;
  lastUsed: string;
  useCount: number;
  lastUsedTimestamp: number;
}

export type VaultSortBy = 'recent' | 'frequent' | 'name';

export type AssetFilter = 'all' | 'scanned' | 'vulnerable';

export type PayloadType = 'reverse_shell' | 'bind_shell' | 'meterpreter' | 'web_shell' | 'custom';

export type PayloadVariant = 'bash' | 'python' | 'perl' | 'netcat' | 'powershell' | 'php' | 'jsp' | 'aspx';
