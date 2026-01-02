#!/usr/bin/env python3
"""
Clear discovered hosts from passive discovery
Useful for testing the broadcast filter
"""

import requests
import sys

API_BASE = "http://localhost:8000/api"

def clear_discovered_hosts():
    """Clear discovered hosts by restarting the sniffer service"""
    print("Clearing discovered hosts...")
    print("Note: In production, this would require backend restart.")
    print("For testing, you can:")
    print("  1. Restart the backend container: docker-compose restart backend")
    print("  2. Or manually clear via Python console in backend")
    print("\nAlternatively, wait for import to complete and check the results.")
    
def get_discovered_hosts(token=None):
    """Get currently discovered hosts"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        response = requests.get(f"{API_BASE}/discovery/passive-discovery", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"\nDiscovered Hosts: {data['total']}")
            print("="*60)
            for host in data['hosts']:
                print(f"  {host['ip_address']:<15} | MAC: {host['mac_address']:<17} | First: {host.get('first_seen', 'N/A')}")
            return data['hosts']
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Error getting discovered hosts: {e}")
        return []

def get_settings(token=None):
    """Get current discovery settings"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        response = requests.get(f"{API_BASE}/settings", headers=headers)
        if response.status_code == 200:
            data = response.json()
            discovery = data.get('discovery', {})
            filter_enabled = discovery.get('filter_broadcast_from_passive_discovery', True)
            passive_enabled = discovery.get('passive_discovery', True)
            
            print("\nCurrent Settings:")
            print("="*60)
            print(f"  Passive Discovery: {'ENABLED' if passive_enabled else 'DISABLED'}")
            print(f"  Broadcast Filter:  {'ENABLED' if filter_enabled else 'DISABLED'}")
            return filter_enabled
        else:
            print(f"Error getting settings: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error getting settings: {e}")
        return None

if __name__ == "__main__":
    print("="*60)
    print("PASSIVE DISCOVERY STATUS")
    print("="*60)
    
    # Get settings
    filter_enabled = get_settings()
    
    # Get discovered hosts
    hosts = get_discovered_hosts()
    
    print("\n" + "="*60)
    if filter_enabled:
        print("✓ Broadcast filter is ENABLED")
        print("  Expected: Only unicast IPs should be discovered")
    else:
        print("✗ Broadcast filter is DISABLED")
        print("  Expected: All IPs including broadcast/multicast discovered")
    print("="*60)
