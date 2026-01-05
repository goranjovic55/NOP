import { useState, useEffect } from 'react';
import { accessService } from '../services/accessService';

interface Credential {
  id: number;
  host: string;
  hostname?: string;
  protocol: string;
  username: string;
  lastUsed: string;
  useCount: number;
  lastUsedTimestamp: number;
}

interface UseVaultReturn {
  showVault: boolean;
  setShowVault: (show: boolean) => void;
  isVaultUnlocked: boolean;
  vaultPassword: string;
  setVaultPassword: (password: string) => void;
  vaultCredentials: Credential[];
  vaultSortBy: 'recent' | 'frequent' | 'name';
  setVaultSortBy: (sortBy: 'recent' | 'frequent' | 'name') => void;
  unlockVault: () => Promise<void>;
  loadVaultCredentials: (token: string) => Promise<void>;
  hoveredCredId: number | null;
  setHoveredCredId: (id: number | null) => void;
}

export const useVault = (token: string | null): UseVaultReturn => {
  const [showVault, setShowVault] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultSortBy, setVaultSortBy] = useState<'recent' | 'frequent' | 'name'>('recent');
  const [vaultCredentialsRaw, setVaultCredentialsRaw] = useState<Credential[]>([]);
  const [hoveredCredId, setHoveredCredId] = useState<number | null>(null);

  const unlockVault = async () => {
    if (vaultPassword === 'admin123') {
      setIsVaultUnlocked(true);
      if (token) {
        await loadVaultCredentials(token);
      }
    } else {
      alert('Incorrect vault password');
    }
  };

  const loadVaultCredentials = async (authToken: string) => {
    try {
      const creds = await accessService.getCredentials(authToken);
      const formattedCreds = creds.map((c: any) => ({
        id: c.id,
        host: c.asset_id,
        hostname: c.hostname,
        protocol: c.protocol,
        username: c.username,
        lastUsed: c.last_used || 'Never',
        useCount: c.use_count || 0,
        lastUsedTimestamp: c.last_used ? new Date(c.last_used).getTime() : 0,
      }));
      setVaultCredentialsRaw(formattedCreds);
    } catch (error) {
      console.error('Failed to load vault credentials:', error);
    }
  };

  // Compute sorted credentials
  const vaultCredentials = [...vaultCredentialsRaw].sort((a, b) => {
    if (vaultSortBy === 'recent') {
      return b.lastUsedTimestamp - a.lastUsedTimestamp;
    } else if (vaultSortBy === 'frequent') {
      return b.useCount - a.useCount;
    } else {
      return a.host.localeCompare(b.host);
    }
  });

  return {
    showVault,
    setShowVault,
    isVaultUnlocked,
    vaultPassword,
    setVaultPassword,
    vaultCredentials,
    vaultSortBy,
    setVaultSortBy,
    unlockVault,
    loadVaultCredentials,
    hoveredCredId,
    setHoveredCredId,
  };
};
