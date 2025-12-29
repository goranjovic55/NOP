# Domain Skills - NOP Platform

> Network Observatory Platform specific patterns. Updated by `update_skills` workflow.

## Skill D1: Network Service Pattern

**Trigger**: Creating network services (scanning, sniffing, ping)

**Pattern**:
```python
# Service pattern for network operations
class NetworkService:
    def __init__(self):
        self.active = False
        self.lock = asyncio.Lock()
    
    async def start(self):
        """Start service with proper resource management"""
        async with self.lock:
            if not self.active:
                # Initialize resources
                self.active = True
    
    async def stop(self):
        """Clean shutdown"""
        async with self.lock:
            if self.active:
                # Cleanup resources
                self.active = False
```

**Rules**:
- ✅ Use async/await for I/O operations
- ✅ Implement start/stop lifecycle methods
- ✅ Use locks for thread-safe state management
- ✅ Clean up resources on shutdown

## Skill D2: WebSocket Traffic Streaming

**Trigger**: Real-time data streaming to frontend

**Pattern**:
```python
# WebSocket pattern for traffic/terminal streaming
@router.websocket("/ws/traffic")
async def websocket_traffic(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Stream data to client
            data = await get_next_packet()
            await websocket.send_json(data)
    except WebSocketDisconnect:
        pass  # Client disconnected
    finally:
        # Cleanup resources
        await cleanup()
```

**Rules**:
- ✅ Accept WebSocket connection first
- ✅ Handle WebSocketDisconnect gracefully
- ✅ Always cleanup in finally block
- ✅ Use send_json for structured data

## Skill D3: Protocol Dissection Pattern

**Trigger**: Parsing network packets

**Pattern**:
```python
# Multi-layer protocol dissection
def dissect_packet(packet):
    layers = {}
    
    # Layer 2 (Ethernet)
    if packet.haslayer(Ether):
        layers['ethernet'] = parse_ethernet(packet)
    
    # Layer 3 (IP/ARP)
    if packet.haslayer(IP):
        layers['ip'] = parse_ip(packet)
    elif packet.haslayer(ARP):
        layers['arp'] = parse_arp(packet)
    
    # Layer 4 (TCP/UDP/ICMP)
    if packet.haslayer(TCP):
        layers['tcp'] = parse_tcp(packet)
        # Application layer detection
        layers['app'] = detect_app_protocol(packet)
    
    return layers
```

**Rules**:
- ✅ Parse from Layer 2 upward
- ✅ Check layer existence before parsing
- ✅ Return structured dictionary
- ✅ Include application layer detection

## Skill D4: React Component Props Pattern

**Trigger**: Creating React components

**Pattern**:
```tsx
// TypeScript interface for component props
interface ComponentProps {
  item: Item;                      // Required prop
  onSelect?: (item: Item) => void; // Optional callback
  className?: string;              // Optional styling
}

export const Component: React.FC<ComponentProps> = ({ 
  item, 
  onSelect, 
  className = '' 
}) => {
  const handleClick = useCallback(() => {
    onSelect?.(item);
  }, [item, onSelect]);
  
  return (
    <div className={className} onClick={handleClick}>
      {item.name}
    </div>
  );
};
```

**Rules**:
- ✅ Define TypeScript interface for props
- ✅ Use React.FC with interface type
- ✅ Memoize callbacks with useCallback
- ✅ Optional chaining for optional callbacks
- ✅ Provide default values for optional props

## Skill D5: Zustand Store Pattern

**Trigger**: Creating state management stores

**Pattern**:
```tsx
// Zustand store with typed state and actions
interface StoreState {
  items: Item[];
  selectedItem: Item | null;
  setItems: (items: Item[]) => void;
  selectItem: (item: Item) => void;
  clearSelection: () => void;
}

export const useStore = create<StoreState>((set) => ({
  items: [],
  selectedItem: null,
  setItems: (items) => set({ items }),
  selectItem: (item) => set({ selectedItem: item }),
  clearSelection: () => set({ selectedItem: null }),
}));
```

**Rules**:
- ✅ Define TypeScript interface for state
- ✅ Include both state and actions in interface
- ✅ Use create with typed generic
- ✅ Keep actions simple and focused
- ✅ Use object updates in set()

## Skill D6: API Service Client Pattern

**Trigger**: Creating frontend API clients

**Pattern**:
```tsx
// API service with typed responses
class ApiService {
  private baseUrl = '/api';
  
  async getItems(): Promise<Item[]> {
    const response = await axios.get(`${this.baseUrl}/items`);
    return response.data;
  }
  
  async createItem(data: ItemCreate): Promise<Item> {
    const response = await axios.post(`${this.baseUrl}/items`, data);
    return response.data;
  }
}

export const apiService = new ApiService();
```

**Rules**:
- ✅ Use class-based service pattern
- ✅ Type all method returns
- ✅ Centralize base URL
- ✅ Export singleton instance
- ✅ Use async/await

## Skill D7: Cyberpunk UI Theme

**Trigger**: Styling components

**Pattern**:
```tsx
// Consistent cyberpunk theme classes
const cyberpunkClasses = {
  card: "bg-gray-800 border border-green-500/30 rounded-lg p-4",
  button: "bg-green-600/20 hover:bg-green-600/40 border border-green-500 text-green-400",
  input: "bg-gray-900 border border-gray-700 focus:border-green-500 text-white",
  text: "text-green-400",
  accent: "text-green-500",
  header: "text-xl font-bold text-green-400 mb-4",
};
```

**Rules**:
- ✅ Use green (#22c55e) as primary accent color
- ✅ Gray-800/900 for backgrounds
- ✅ Border with green-500 at 30% opacity
- ✅ Hover states increase opacity
- ✅ Geometric symbols for visual interest

## Skill D8: FastAPI Endpoint Pattern

**Trigger**: Creating API endpoints

**Pattern**:
```python
# FastAPI endpoint with full typing
@router.get("/items", response_model=list[ItemResponse])
async def list_items(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100)
) -> list[ItemResponse]:
    """List items with pagination."""
    result = await db.execute(
        select(Item).offset(skip).limit(limit)
    )
    items = result.scalars().all()
    return items
```

**Rules**:
- ✅ Define response_model for validation
- ✅ Use dependency injection for db and auth
- ✅ Add Query validators for query params
- ✅ Type hint return value
- ✅ Include docstring
- ✅ Use async database operations

## Detected Patterns

### Backend
- Service classes with async lifecycle management
- WebSocket-based real-time streaming
- Scapy for packet capture and dissection
- NMAP integration for network discovery
- Background tasks for long-running operations
- JWT authentication with refresh tokens
- AES-256-GCM encryption for credentials

### Frontend
- React functional components with TypeScript
- Zustand for state management
- Tailwind CSS with cyberpunk theme
- WebSocket connections for real-time updates
- Apache Guacamole integration for remote desktop
- xterm.js for terminal emulation
- Force-directed graphs for topology visualization

### Infrastructure
- Multi-container Docker Compose orchestration
- PostgreSQL for persistent storage
- Redis for caching and pub/sub
- Test environment with isolated network
- Health checks on all services

---

**Updated**: 2025-12-29 by update_skills workflow
