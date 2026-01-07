import { useState, useEffect, useMemo } from 'react';
import { Asset } from '../services/assetService';

type AssetFilterType = 'all' | 'scanned' | 'vulnerable';

interface UseAssetFilterReturn {
  assetFilter: AssetFilterType;
  setAssetFilter: (filter: AssetFilterType) => void;
  ipFilter: string;
  setIpFilter: (filter: string) => void;
  filteredAssets: Asset[];
}

export const useAssetFilter = (assets: Asset[]): UseAssetFilterReturn => {
  const [assetFilter, setAssetFilterState] = useState<AssetFilterType>(() => {
    const saved = localStorage.getItem('access_assetFilter');
    return (saved as AssetFilterType) || 'all';
  });

  const [ipFilter, setIpFilterState] = useState(() => 
    localStorage.getItem('access_ipFilter') || ''
  );

  // Persist filter state to localStorage
  useEffect(() => {
    localStorage.setItem('access_assetFilter', assetFilter);
  }, [assetFilter]);

  useEffect(() => {
    localStorage.setItem('access_ipFilter', ipFilter);
  }, [ipFilter]);

  const setAssetFilter = (filter: AssetFilterType) => {
    setAssetFilterState(filter);
  };

  const setIpFilter = (filter: string) => {
    setIpFilterState(filter);
  };

  // Filter assets based on current filters
  const filteredAssets = useMemo(() => {
    let result = assets;

    // Apply asset type filter
    if (assetFilter === 'scanned') {
      result = result.filter(a => a.scan_count && a.scan_count > 0);
    } else if (assetFilter === 'vulnerable') {
      result = result.filter(a => a.vulnerability_count && a.vulnerability_count > 0);
    }

    // Apply IP filter
    if (ipFilter) {
      const filterLower = ipFilter.toLowerCase();
      result = result.filter(a => 
        a.ip_address.toLowerCase().includes(filterLower) ||
        (a.hostname && a.hostname.toLowerCase().includes(filterLower))
      );
    }

    return result;
  }, [assets, assetFilter, ipFilter]);

  return {
    assetFilter,
    setAssetFilter,
    ipFilter,
    setIpFilter,
    filteredAssets,
  };
};
