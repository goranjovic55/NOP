# Frontend React Patterns

## When to Use
- Creating UI components
- Managing component state
- Fetching API data
- Building forms and user inputs
- **Building/modifying any React/JSX files**

## Critical Rules - MUST FOLLOW

### Docker Compose for Local Development
**ALWAYS use `docker-compose.dev.yml` for local frontend work:**
```bash
# ✅ CORRECT - Builds from local source
docker-compose -f docker-compose.dev.yml build frontend
docker-compose -f docker-compose.dev.yml up -d frontend

# ❌ WRONG - Uses pre-built registry images
docker-compose build frontend  # <-- DON'T DO THIS
```
**Why:** `docker-compose.yml` uses `image: ghcr.io/.../nop-frontend:latest` (registry), while `docker-compose.dev.yml` has `build: context: ./frontend` (local source).

### JSX Comment Syntax
**Comments inside JSX MUST be in braces:**
```tsx
// ✅ CORRECT
<div>
  {/* Comment here */}
  <Component />
</div>

// ❌ WRONG - Causes "')' expected" syntax error
{condition ? (
  <A />
) : (
  /* Comment here */  {/* <-- BREAKS BUILD */}
  <B />
)}

// ✅ CORRECT FIX
{condition ? (
  <A />
) : (
  <>
    {/* Comment here */}
    <B />
  </>
)}
```

## Avoid
- ❌ Prop drilling → ✅ Use context or state management
- ❌ Missing key props in lists → ✅ Use unique keys
- ❌ Direct DOM manipulation → ✅ Use React refs
- ❌ Large component files → ✅ Extract subcomponents

### POV (Point of View) Mode Pattern
**Use when:** Agent-specific data filtering, multi-tenant isolation

```tsx
// Context-based filtering
import { usePOV, getPOVHeaders } from '../context/POVContext';

const MyComponent = () => {
  const { activeAgent } = usePOV();
  
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/data', {
        headers: {
          ...getPOVHeaders(activeAgent),  // Adds X-Agent-POV header
          Authorization: `Bearer ${token}`
        }
      });
    };
    fetchData();
  }, [token, activeAgent]);  // Include activeAgent in deps!
};
```

**Critical:** Add `activeAgent` to dependencies to prevent stale closures

React components with TypeScript and hooks.

## Checklist
- [ ] Small components (<200 lines)
- [ ] TypeScript interface for props
- [ ] Memoize callbacks with useCallback
- [ ] Optional chaining for optional callbacks
- [ ] Effects cleanup (useEffect return)

## Examples

### Basic Component
```tsx
interface CardProps {
  item: Item;
  onSelect?: (item: Item) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  item, 
  onSelect, 
  onDelete,
  className = '' 
}) => {
  const handleSelect = useCallback(() => {
    onSelect?.(item);
  }, [item, onSelect]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(item.id);
  }, [item.id, onDelete]);
  
  return (
    <div className={`card ${className}`} onClick={handleSelect}>
      <h3>{item.name}</h3>
      {onDelete && <button onClick={handleDelete}>Delete</button>}
    </div>
  );
};
```

### Component with Children
```tsx
interface PanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, icon, children, actions }) => (
  <div className="panel">
    <div className="panel-header">
      {icon && <span className="icon">{icon}</span>}
      <h2>{title}</h2>
      {actions && <div className="actions">{actions}</div>}
    </div>
    <div className="panel-content">{children}</div>
  </div>
);
```

### Custom Hook
```tsx
function usePolling<T>(fetcher: () => Promise<T>, interval = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const poll = async () => {
      try {
        const result = await fetcher();
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setError(err as Error);
      }
    };

    poll();
    const id = setInterval(poll, interval);
    
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [fetcher, interval]);

  return { data, loading, error };
}
```

### Zustand Store
```tsx
import { create } from 'zustand';

interface ItemStore {
  items: Item[];
  loading: boolean;
  fetchItems: () => Promise<void>;
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
}

export const useItemStore = create<ItemStore>((set) => ({
  items: [],
  loading: false,
  
  fetchItems: async () => {
    set({ loading: true });
    const items = await api.getItems();
    set({ items, loading: false });
  },
  
  addItem: (item) => set((state) => ({ 
    items: [...state.items, item] 
  })),
  
  removeItem: (id) => set((state) => ({ 
    items: state.items.filter(i => i.id !== id) 
  })),
}));
```

---

## CyberUI Design System

Import from `'../components/CyberUI'` - use .cyber-card, .cyber-panel classes.

### Page Layout
```tsx
import { CyberPageTitle, CyberCard, CyberSectionHeader } from '../components/CyberUI';

const MyPage: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <CyberPageTitle color="red">Page Name</CyberPageTitle>
        <div className="flex gap-2">
          {/* Action buttons */}
        </div>
      </div>

      {/* Main Content */}
      <CyberCard>
        <CyberSectionHeader title="Section Name" subtitle="Optional description" />
        <div className="p-4">
          {/* Content */}
        </div>
      </CyberCard>
    </div>
  );
};
```

### Form Components
```tsx
import { CyberInput, CyberSelect, CyberSlider, CyberButton } from '../components/CyberUI';

const ConfigForm: React.FC = () => {
  const [name, setName] = useState('');
  const [type, setType] = useState('tcp');
  const [rate, setRate] = useState(100);

  return (
    <div className="space-y-4">
      <CyberInput
        type="text"
        placeholder="Enter name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <CyberSelect value={type} onChange={(e) => setType(e.target.value)}>
        <option value="tcp">TCP</option>
        <option value="udp">UDP</option>
      </CyberSelect>

      <CyberSlider
        label="Packet Rate"
        value={rate}
        min={1}
        max={1000}
        unit="pps"
        onChange={setRate}
      />

      <CyberButton variant="red" size="md" onClick={handleSubmit}>
        Submit
      </CyberButton>
    </div>
  );
};
```

### Tab Navigation Pattern
```tsx
import { CyberTabs } from '../components/CyberUI';

const TabbedPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div>
      <CyberTabs
        tabs={[
          { id: 'overview', label: 'Overview', color: 'blue' },
          { id: 'details', label: 'Details', color: 'green' },
          { id: 'advanced', label: 'Advanced', color: 'purple' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'overview' && <OverviewContent />}
      {activeTab === 'details' && <DetailsContent />}
      {activeTab === 'advanced' && <AdvancedContent />}
    </div>
  );
};
```

### Interactive Card Pattern
```tsx
import { CyberCard } from '../components/CyberUI';

const AssetCard: React.FC<{ asset: Asset }> = ({ asset }) => (
  <CyberCard 
    interactive 
    onClick={() => navigate(`/assets/${asset.id}`)}
    className="p-4"
  >
    <div className="flex justify-between items-center">
```

## Frontend Build & Deploy Checklist

### Before Testing Changes
1. ✅ Build with dev compose file:
   ```bash
   docker-compose -f docker-compose.dev.yml build frontend
   ```
2. ✅ Watch for "Syntax error:" or "Failed to compile" messages
3. ✅ Verify "File sizes after gzip:" appears (success indicator)
4. ✅ Restart frontend:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d frontend
   ```
5. ✅ Verify build hash changed:
   ```bash
   docker-compose -f docker-compose.dev.yml exec frontend cat /usr/share/nginx/html/index.html | grep -o 'main\.[^"]*\.js'
   ```
6. ✅ Tell user to **hard refresh** browser (Ctrl+Shift+R)

### Common Build Errors
| Error | Cause | Fix |
|-------|-------|-----|
| `Syntax error: ')' expected` | Comment outside JSX braces | Wrap in `{/* */}` or put in fragment |
| Frontend shows old code | Used wrong docker-compose file | Use `docker-compose.dev.yml` |
| UI doesn't update | Browser cache | Hard refresh (Ctrl+Shift+R) |

### Environment URLs
- Frontend: http://localhost:12000
- Backend: http://localhost:8000/docs
- Credentials: admin / admin123
      <div>
        <h3 className="text-cyber-blue font-bold">{asset.ip}</h3>
        <p className="text-xs text-cyber-gray-light">{asset.hostname}</p>
      </div>
      <CyberBadge variant={asset.status === 'online' ? 'online' : 'offline'}>
        {asset.status}
      </CyberBadge>
    </div>
  </CyberCard>
);
```

### Panel with Section Headers
```tsx
import { CyberPanel, CyberSectionHeader } from '../components/CyberUI';

const ConfigPanel: React.FC = () => (
  <CyberPanel className="flex flex-col">
    <CyberSectionHeader 
      title="Configuration" 
      subtitle="Network Settings"
      actions={<button className="btn-base btn-sm btn-blue">Edit</button>}
    />
    <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
      {/* Panel content */}
    </div>
  </CyberPanel>
);
```

### Reference
See `/docs/design/UNIFIED_STYLE_GUIDE.md` for complete style guide.

## Related Skills
- `testing.md` - Component testing
- `debugging.md` - React debugging
- `documentation.md` - Component docs
