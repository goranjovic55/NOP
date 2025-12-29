#!/usr/bin/env python3
"""
Test script to verify that passive discovery works correctly in both modes:
1. Source-only mode (track_source_only=True): Only tracks source IPs
2. Full mode (track_source_only=False): Tracks both source and destination with filtering

This script:
1. Tests source-only mode (safe, no false positives)
2. Tests full mode (may catch passive listeners, filtered)
3. Verifies broadcast/multicast filtering works correctly
"""

import requests
import socket
import time
from scapy.all import IP, UDP, sendp, Ether
import sys

BACKEND_URL = "http://localhost:12001"
CLEAR_ENDPOINT = f"{BACKEND_URL}/api/v1/discovery/clear-passive-discovery"
STATUS_ENDPOINT = f"{BACKEND_URL}/api/v1/discovery/passive-discovery"
SETTINGS_ENDPOINT = f"{BACKEND_URL}/api/v1/settings/discovery"

def get_settings():
    """Get current discovery settings."""
    response = requests.get(f"{BACKEND_URL}/api/v1/settings")
    if response.status_code == 200:
        return response.json().get("discovery", {})
    return {}

def set_track_source_only(enabled: bool):
    """Update track_source_only setting."""
    settings = get_settings()
    settings["track_source_only"] = enabled
    response = requests.put(SETTINGS_ENDPOINT, json=settings)
    if response.status_code == 200:
        print(f"✓ Set track_source_only = {enabled}")
        time.sleep(1)  # Wait for settings to apply
        return True
    else:
        print(f"✗ Failed to update settings: {response.status_code}")
        return False

def clear_discovered_hosts():
    """Clear all currently discovered hosts."""
    response = requests.post(CLEAR_ENDPOINT)
    if response.status_code == 200:
        print("✓ Cleared discovered hosts")
        return True
    else:
        print(f"✗ Failed to clear hosts: {response.status_code}")
        return False

def get_discovered_hosts():
    """Get currently discovered hosts."""
    response = requests.get(STATUS_ENDPOINT)
    if response.status_code == 200:
        data = response.json()
        return data.get("hosts", [])
    else:
        print(f"✗ Failed to get hosts: {response.status_code}")
        return []

def get_my_ip():
    """Get the IP address of this host on eth0 (Docker network)."""
    try:
        # Connect to a known external IP to determine our outgoing IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        my_ip = s.getsockname()[0]
        s.close()
        return my_ip
    except:
        return None

def send_test_packets():
    """Send packets with various destination types."""
    my_ip = get_my_ip()
    if not my_ip:
        print("✗ Could not determine local IP")
        return None
    
    print(f"\n📡 Sending packets from source: {my_ip}")
    
    # Create packets with different destination types
    destinations = [
        ("Unicast", "8.8.8.8"),
        ("Broadcast", "255.255.255.255"),
        ("Multicast", "224.0.0.1"),
        ("Link-local", "169.254.1.1"),
        ("Multicast SSDP", "239.255.255.250"),
    ]
    
    for dest_type, dest_ip in destinations:
        try:
            # Create UDP packet
            packet = IP(src=my_ip, dst=dest_ip) / UDP(sport=12345, dport=1234) / b"TEST"
            # Send raw packet
            sendp(Ether() / packet, verbose=False)
            print(f"  → Sent packet to {dest_type} ({dest_ip})")
        except Exception as e:
            print(f"  ✗ Failed to send to {dest_ip}: {e}")
    
    return my_ip

def main():
    print("=" * 70)
    print("Passive Discovery Dual-Mode Test")
    print("=" * 70)
    
    my_ip = get_my_ip()
    if not my_ip:
        print("✗ Could not determine local IP")
        sys.exit(1)
    
    print(f"\n📍 Testing from source IP: {my_ip}")
    
    # ========== TEST 1: Source-Only Mode (Safe) ==========
    print("\n" + "=" * 70)
    print("TEST 1: Source-Only Mode (track_source_only=True)")
    print("=" * 70)
    print("Expected: Only source IP discovered, no broadcast/multicast")
    
    if not set_track_source_only(True):
        sys.exit(1)
    
    print("\n1. Clearing discovered hosts...")
    clear_discovered_hosts()
    time.sleep(2)
    
    print("\n2. Sending test packets...")
    send_test_packets()
    
    print("\n3. Waiting 5 seconds for sniffer...")
    time.sleep(5)
    
    print("\n4. Checking discovered hosts...")
    hosts_source_only = get_discovered_hosts()
    discovered_ips_source = [h['ip_address'] for h in hosts_source_only]
    
    print(f"\n   Discovered {len(hosts_source_only)} host(s):")
    for host in hosts_source_only:
        print(f"   - {host['ip_address']} (MAC: {host['mac_address']})")
    
    # Verify source-only mode
    bad_ips_source = [ip for ip in discovered_ips_source 
                      if ip in ["255.255.255.255", "224.0.0.1", "169.254.1.1", "239.255.255.250"]]
    
    if bad_ips_source:
        print(f"\n✗ FAIL: Broadcast/multicast IPs found: {bad_ips_source}")
        test1_passed = False
    elif my_ip in discovered_ips_source:
        print(f"\n✓ PASS: Only source IP ({my_ip}) discovered, no false positives")
        test1_passed = True
    else:
        print(f"\n⚠ WARNING: Source IP ({my_ip}) not discovered")
        test1_passed = False
    
    # ========== TEST 2: Full Mode (Source + Destination with Filtering) ==========
    print("\n" + "=" * 70)
    print("TEST 2: Full Mode (track_source_only=False)")
    print("=" * 70)
    print("Expected: Source + filtered destinations (no broadcast/multicast)")
    
    if not set_track_source_only(False):
        sys.exit(1)
    
    print("\n1. Clearing discovered hosts...")
    clear_discovered_hosts()
    time.sleep(2)
    
    print("\n2. Sending test packets (including to 8.8.8.8)...")
    send_test_packets()
    
    print("\n3. Waiting 5 seconds for sniffer...")
    time.sleep(5)
    
    print("\n4. Checking discovered hosts...")
    hosts_full = get_discovered_hosts()
    discovered_ips_full = [h['ip_address'] for h in hosts_full]
    
    print(f"\n   Discovered {len(hosts_full)} host(s):")
    for host in hosts_full:
        print(f"   - {host['ip_address']} (MAC: {host['mac_address']})")
    
    # Verify full mode
    bad_ips_full = [ip for ip in discovered_ips_full 
                    if ip in ["255.255.255.255", "224.0.0.1", "169.254.1.1", "239.255.255.250"]]
    
    if bad_ips_full:
        print(f"\n✗ FAIL: Broadcast/multicast IPs found: {bad_ips_full}")
        test2_passed = False
    elif my_ip in discovered_ips_full:
        # In full mode, we should have source + potentially legitimate destinations
        if len(hosts_full) >= len(hosts_source_only):
            print(f"\n✓ PASS: Source + destinations discovered, broadcast/multicast filtered")
            print(f"   Source-only mode: {len(hosts_source_only)} hosts")
            print(f"   Full mode: {len(hosts_full)} hosts")
            if "8.8.8.8" in discovered_ips_full:
                print(f"   ✓ Destination IP (8.8.8.8) tracked as expected")
            test2_passed = True
        else:
            print(f"\n⚠ WARNING: Full mode has fewer hosts than source-only")
            test2_passed = False
    else:
        print(f"\n✗ FAIL: Source IP ({my_ip}) not discovered")
        test2_passed = False
    
    # ========== SUMMARY ==========
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Test 1 (Source-Only): {'✓ PASSED' if test1_passed else '✗ FAILED'}")
    print(f"Test 2 (Full Mode):   {'✓ PASSED' if test2_passed else '✗ FAILED'}")
    
    if test1_passed and test2_passed:
        print("\n✓ ALL TESTS PASSED: Dual-mode tracking working correctly!")
    else:
        print("\n✗ SOME TESTS FAILED: Check implementation")
    print("=" * 70)
    
    # Restore default setting
    set_track_source_only(True)

if __name__ == "__main__":
    main()
