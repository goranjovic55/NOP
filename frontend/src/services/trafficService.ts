import axios from 'axios';

const API_URL = '/api/v1';

export interface BurstCaptureConnection {
  source: string;
  target: string;
  value: number;
  protocols?: string[];
  last_seen?: number;
  first_seen?: number;
  packet_count?: number;
}

export interface BurstCaptureResult {
  success: boolean;
  duration: number;
  connections: BurstCaptureConnection[];
  connection_count: number;
  current_time?: number;
}

export interface TrafficConnection {
  source: string;
  target: string;
  value: number;
  protocols?: string[];
  last_seen?: number | string;
  first_seen?: number | string;
  packet_count?: number;
}

export interface TrafficStats {
  total_flows: number;
  total_bytes: number;
  top_talkers: { ip: string; bytes: number }[];
  protocols: Record<string, number>;
  traffic_history: { time: string; value: number }[];
  connections: TrafficConnection[];
  current_time?: number;
  is_sniffing?: boolean;
  interface?: string;
}

export interface CaptureStatus {
  is_sniffing: boolean;
  interface: string | null;
  filter: string | null;
}

export const trafficService = {
  /**
   * Perform a burst capture for live topology updates.
   * This captures fresh traffic for the specified duration (1-10 seconds).
   */
  burstCapture: async (
    token: string, 
    durationSeconds: number = 1,
    agentPOV?: string
  ): Promise<BurstCaptureResult> => {
    const headers: Record<string, string> = { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    if (agentPOV) {
      headers['X-Agent-POV'] = agentPOV;
    }
    const response = await axios.post(
      `${API_URL}/traffic/burst-capture`,
      { duration_seconds: durationSeconds },
      { headers }
    );
    return response.data;
  },

  /**
   * Get current traffic stats (includes connections with timestamps)
   */
  getStats: async (token: string, agentPOV?: string): Promise<TrafficStats> => {
    const headers: Record<string, string> = { 
      Authorization: `Bearer ${token}` 
    };
    if (agentPOV) {
      headers['X-Agent-POV'] = agentPOV;
    }
    const response = await axios.get(`${API_URL}/traffic/stats`, { headers });
    return response.data;
  },

  /**
   * Start persistent packet capture (continues when leaving page)
   */
  startCapture: async (
    token: string,
    iface: string = 'eth0',
    filter: string = ''
  ): Promise<{ success: boolean; is_sniffing: boolean }> => {
    const response = await axios.post(
      `${API_URL}/traffic/start-capture`,
      { interface: iface, filter },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  /**
   * Stop persistent packet capture
   */
  stopCapture: async (token: string): Promise<{ success: boolean; was_sniffing: boolean }> => {
    const response = await axios.post(
      `${API_URL}/traffic/stop-capture`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get current capture status
   */
  getCaptureStatus: async (token: string): Promise<CaptureStatus> => {
    const response = await axios.get(`${API_URL}/traffic/capture-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Calculate visual properties for topology based on traffic data
   */
  calculateLinkVisuals: (
    link: { value: number; reverseValue?: number; last_seen?: number | string },
    currentTime: number
  ) => {
    const totalTraffic = link.value + (link.reverseValue || 0);
    
    // Link width: logarithmic scale, max 8px
    const MIN_WIDTH = 0.5;
    const MAX_WIDTH = 8;
    const width = totalTraffic > 0 
      ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.log10(totalTraffic + 1) * 2))
      : MIN_WIDTH;
    
    // Link brightness/opacity based on recency
    // 100% if traffic < 5 seconds ago, fades to 30% at 60+ seconds
    let opacity = 0.3; // Default dim for old/no timestamp
    if (link.last_seen) {
      const lastSeenTime = typeof link.last_seen === 'string' 
        ? new Date(link.last_seen).getTime() / 1000 
        : link.last_seen;
      const secondsAgo = currentTime - lastSeenTime;
      if (secondsAgo < 5) {
        opacity = 1.0;
      } else if (secondsAgo < 60) {
        opacity = 1.0 - (secondsAgo - 5) * (0.7 / 55); // Fade from 1.0 to 0.3
      } else {
        opacity = 0.3;
      }
    }
    
    return { width, opacity };
  },

  /**
   * Calculate node size based on connection count
   */
  calculateNodeSize: (connectionCount: number): number => {
    const MIN_SIZE = 4;
    const MAX_SIZE = 15;
    // Base size + log scale of connections
    return Math.min(MAX_SIZE, MIN_SIZE + Math.log10(connectionCount + 1) * 4);
  }
};
