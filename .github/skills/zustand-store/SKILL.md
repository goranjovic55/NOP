---
name: zustand-store
description: Zustand state management patterns with TypeScript. Use when creating or updating global state stores.
---

# Zustand Store Pattern

## When to Use
- Creating global state stores
- Managing shared application state
- Implementing actions/mutations
- Optimizing re-renders

## Pattern
Typed state interface with create function

## Checklist
- [ ] Define TypeScript interface for state
- [ ] Include both state and actions in interface
- [ ] Use create with typed generic
- [ ] Keep actions simple and focused
- [ ] Use object updates in set()

## Examples

### Basic Store
```tsx
import create from 'zustand';

interface ScanStore {
  // State
  scans: Scan[];
  selectedScan: Scan | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setScans: (scans: Scan[]) => void;
  addScan: (scan: Scan) => void;
  updateScan: (id: string, updates: Partial<Scan>) => void;
  deleteScan: (id: string) => void;
  selectScan: (scan: Scan | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useScanStore = create<ScanStore>((set) => ({
  // Initial state
  scans: [],
  selectedScan: null,
  isLoading: false,
  error: null,
  
  // Actions
  setScans: (scans) => set({ scans }),
  
  addScan: (scan) => set((state) => ({ 
    scans: [...state.scans, scan] 
  })),
  
  updateScan: (id, updates) => set((state) => ({
    scans: state.scans.map(scan =>
      scan.id === id ? { ...scan, ...updates } : scan
    )
  })),
  
  deleteScan: (id) => set((state) => ({
    scans: state.scans.filter(scan => scan.id !== id),
    selectedScan: state.selectedScan?.id === id ? null : state.selectedScan
  })),
  
  selectScan: (scan) => set({ selectedScan: scan }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
```

### Async Actions with Middleware
```tsx
import create from 'zustand';
import { devtools } from 'zustand/middleware';

interface ScanStore extends BaseScanStore {
  // Async actions
  loadScans: () => Promise<void>;
  createScan: (data: ScanCreate) => Promise<void>;
  refreshScan: (id: string) => Promise<void>;
}

export const useScanStore = create<ScanStore>()(
  devtools((set, get) => ({
    scans: [],
    selectedScan: null,
    isLoading: false,
    error: null,
    
    setScans: (scans) => set({ scans }),
    selectScan: (scan) => set({ selectedScan: scan }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    
    // Async actions
    loadScans: async () => {
      set({ isLoading: true, error: null });
      try {
        const scans = await apiService.getScans();
        set({ scans, isLoading: false });
      } catch (error) {
        set({ error: error.message, isLoading: false });
      }
    },
    
    createScan: async (data) => {
      set({ isLoading: true, error: null });
      try {
        const newScan = await apiService.createScan(data);
        set((state) => ({
          scans: [...state.scans, newScan],
          isLoading: false
        }));
      } catch (error) {
        set({ error: error.message, isLoading: false });
      }
    },
    
    refreshScan: async (id) => {
      try {
        const updatedScan = await apiService.getScan(id);
        set((state) => ({
          scans: state.scans.map(scan =>
            scan.id === id ? updatedScan : scan
          )
        }));
      } catch (error) {
        set({ error: error.message });
      }
    },
  }))
);
```

### Selector Optimization
```tsx
// Component usage with selectors
export const ScanList: React.FC = () => {
  // Only re-render when scans change
  const scans = useScanStore(state => state.scans);
  const loadScans = useScanStore(state => state.loadScans);
  
  useEffect(() => {
    loadScans();
  }, [loadScans]);
  
  return (
    <div>
      {scans.map(scan => (
        <ScanCard key={scan.id} scan={scan} />
      ))}
    </div>
  );
};

// Select only needed fields
const ScanStatus: React.FC<{ scanId: string }> = ({ scanId }) => {
  const status = useScanStore(
    state => state.scans.find(s => s.id === scanId)?.status
  );
  
  return <span>{status}</span>;
};
```

### Multiple Stores
```tsx
// Split concerns into multiple stores

// scanStore.ts
export const useScanStore = create<ScanStore>((set) => ({
  scans: [],
  // ... scan-related state and actions
}));

// hostStore.ts
export const useHostStore = create<HostStore>((set) => ({
  hosts: [],
  // ... host-related state and actions
}));

// trafficStore.ts
export const useTrafficStore = create<TrafficStore>((set) => ({
  packets: [],
  // ... traffic-related state and actions
}));

// Component can use multiple stores
const Dashboard: React.FC = () => {
  const scans = useScanStore(state => state.scans);
  const hosts = useHostStore(state => state.hosts);
  const packets = useTrafficStore(state => state.packets);
  
  return <div>{/* render dashboard */}</div>;
};
```

### Persist Middleware
```tsx
import { persist } from 'zustand/middleware';

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      autoRefresh: true,
      refreshInterval: 5000,
      
      setTheme: (theme) => set({ theme }),
      setAutoRefresh: (auto) => set({ autoRefresh: auto }),
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
    }),
    {
      name: 'nop-settings', // LocalStorage key
    }
  )
);
```
