/**
 * Shared network-related constants
 */

export const COMMON_PORTS = [
  { port: 21, name: 'FTP' },
  { port: 22, name: 'SSH' },
  { port: 23, name: 'Telnet' },
  { port: 25, name: 'SMTP' },
  { port: 53, name: 'DNS' },
  { port: 80, name: 'HTTP' },
  { port: 443, name: 'HTTPS' },
  { port: 445, name: 'SMB' },
  { port: 3306, name: 'MySQL' },
  { port: 3389, name: 'RDP' },
  { port: 5432, name: 'PostgreSQL' },
  { port: 5900, name: 'VNC' },
  { port: 8080, name: 'HTTP-Alt' },
] as const;

export const PROTOCOL_TYPES = ['TCP', 'UDP', 'ICMP', 'ARP', 'IP'] as const;

export type ProtocolType = typeof PROTOCOL_TYPES[number];
export type CommonPort = typeof COMMON_PORTS[number];
