---
name: api-service
description: Frontend API client patterns with Axios and TypeScript. Use when creating API service clients.
---

# API Service Client Pattern

## When to Use
- Creating frontend API clients
- Organizing API calls
- Handling API responses
- Managing API errors

## Pattern
Class-based service with typed responses

## Checklist
- [ ] Use class-based service pattern
- [ ] Type all method returns
- [ ] Centralize base URL
- [ ] Export singleton instance
- [ ] Use async/await

## Examples

### Basic API Service
```tsx
import axios, { AxiosInstance } from 'axios';

class ApiService {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Request interceptor (add auth token)
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor (handle errors)
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
  
  // Scans
  async getScans(): Promise<Scan[]> {
    const response = await this.client.get('/scans');
    return response.data;
  }
  
  async getScan(id: string): Promise<Scan> {
    const response = await this.client.get(`/scans/${id}`);
    return response.data;
  }
  
  async createScan(data: ScanCreate): Promise<Scan> {
    const response = await this.client.post('/scans', data);
    return response.data;
  }
  
  async updateScan(id: string, data: Partial<Scan>): Promise<Scan> {
    const response = await this.client.patch(`/scans/${id}`, data);
    return response.data;
  }
  
  async deleteScan(id: string): Promise<void> {
    await this.client.delete(`/scans/${id}`);
  }
  
  // Hosts
  async getHosts(): Promise<Host[]> {
    const response = await this.client.get('/hosts');
    return response.data;
  }
  
  async getHost(id: string): Promise<Host> {
    const response = await this.client.get(`/hosts/${id}`);
    return response.data;
  }
}

export const apiService = new ApiService();
```

### Error Handling
```tsx
// Custom error types
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Enhanced service with error handling
class ApiService {
  // ...
  
  private async request<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: any
  ): Promise<T> {
    try {
      const response = await this.client.request({
        method,
        url,
        data,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new ApiError(
          error.response.status,
          error.response.data.error || 'API request failed',
          error.response.data.details
        );
      }
      throw new ApiError(0, 'Network error');
    }
  }
  
  async getScans(): Promise<Scan[]> {
    return this.request('get', '/scans');
  }
  
  async createScan(data: ScanCreate): Promise<Scan> {
    return this.request('post', '/scans', data);
  }
}
```

### Query Parameters
```tsx
class ApiService {
  async getScans(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Scan[]> {
    const response = await this.client.get('/scans', { params });
    return response.data;
  }
  
  async searchHosts(query: string): Promise<Host[]> {
    const response = await this.client.get('/hosts/search', {
      params: { q: query }
    });
    return response.data;
  }
}

// Usage
const activeScans = await apiService.getScans({ status: 'active', limit: 10 });
const results = await apiService.searchHosts('192.168.1');
```

### File Upload
```tsx
class ApiService {
  async uploadEvidence(scanId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.client.post(
      `/scans/${scanId}/evidence`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data.file_url;
  }
}
```

### WebSocket Connection
```tsx
class ApiService {
  connectTrafficStream(): WebSocket {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/traffic`);
    
    ws.onopen = () => {
      console.log('Traffic stream connected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return ws;
  }
  
  connectTerminal(hostId: string): WebSocket {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return new WebSocket(`${protocol}//${window.location.host}/api/ws/terminal/${hostId}`);
  }
}
```

### React Hook Integration
```tsx
// Custom hook for API calls
function useScans() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadScans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getScans();
      setScans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scans');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadScans();
  }, [loadScans]);
  
  return { scans, loading, error, reload: loadScans };
}

// Usage in component
const ScanList: React.FC = () => {
  const { scans, loading, error, reload } = useScans();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <button onClick={reload}>Refresh</button>
      {scans.map(scan => <ScanCard key={scan.id} scan={scan} />)}
    </div>
  );
};
```
