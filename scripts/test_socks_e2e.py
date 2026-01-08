#!/usr/bin/env python3
"""
SOCKS Integration E2E Test
Tests the full SOCKS proxy flow: WebSocket → SOCKS Proxy → ProxyChains → nmap
"""

import asyncio
import websockets
import json
import sys
import subprocess
import time
from uuid import UUID

# Configuration
C2_URL = "ws://localhost:8000/api/v1/agents/ws"
AGENT_ID = None  # Will be loaded from /tmp/agent_id.txt
TEST_TARGET = "172.29.0.10"  # nop-postgres container

async def test_websocket_connection():
    """Test 1: WebSocket connection and SOCKS proxy creation"""
    print("\n" + "="*60)
    print("TEST 1: WebSocket Connection & SOCKS Proxy Creation")
    print("="*60)
    
    try:
        # Load agent ID
        with open("/tmp/agent_id.txt", "r") as f:
            agent_id = f.read().strip()
        print(f"✅ Agent ID: {agent_id}")
        
        # Load auth token
        with open("/tmp/agent_auth_token.txt", "r") as f:
            auth_token = f.read().strip()
        print(f"✅ Auth Token: {auth_token[:20]}...")
        
        # Connect to WebSocket
        print(f"Connecting to: {C2_URL}")
        async with websockets.connect(C2_URL) as websocket:
            print("✅ WebSocket connected")
            
            # Send registration
            register_msg = {
                "type": "register",
                "agent_id": agent_id,
                "auth_token": auth_token,
                "hostname": "test-socks-host",
                "ip_address": "172.29.0.99",
                "os": "Linux",
                "architecture": "x86_64"
            }
            await websocket.send(json.dumps(register_msg))
            print("✅ Registration sent")
            
            # Wait for registration response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)
            print(f"✅ Registration response: {data.get('type')}")
            
            if data.get("type") == "registered":
                socks_port = data.get("socks_port")
                if socks_port:
                    print(f"✅ SOCKS proxy created on port: {socks_port}")
                    
                    # Keep connection alive and test SOCKS proxy
                    print("Keeping WebSocket alive for testing...")
                    
                    # Test 2 inline: Check if SOCKS proxy is listening
                    await asyncio.sleep(2)  # Give proxy time to start
                    import socket
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(2)
                    result = sock.connect_ex(('127.0.0.1', socks_port))
                    sock.close()
                    
                    if result == 0:
                        print(f"✅ SOCKS proxy confirmed listening on 127.0.0.1:{socks_port}")
                    else:
                        print(f"⚠️  SOCKS proxy not yet listening on port {socks_port}")
                    
                    # Send a heartbeat to keep alive
                    await websocket.send(json.dumps({"type": "heartbeat"}))
                    
                    return socks_port, agent_id
                else:
                    print("❌ No SOCKS port in registration response")
                    print(f"   Response data: {data}")
                    return None, agent_id
            else:
                print(f"❌ Unexpected response type: {data.get('type')}")
                print(f"   Full response: {data}")
                return None, agent_id
                
    except Exception as e:
        print(f"❌ Test 1 failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None


def test_socks_proxy_port(socks_port):
    """Test 2: Verify SOCKS proxy is listening"""
    print("\n" + "="*60)
    print("TEST 2: SOCKS Proxy Port Listening")
    print("="*60)
    
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(('127.0.0.1', socks_port))
        sock.close()
        
        if result == 0:
            print(f"✅ SOCKS proxy listening on 127.0.0.1:{socks_port}")
            return True
        else:
            print(f"❌ SOCKS proxy not listening on port {socks_port}")
            return False
    except Exception as e:
        print(f"❌ Test 2 failed: {e}")
        return False


def test_agent_metadata(agent_id, socks_port):
    """Test 3: Verify agent metadata has SOCKS port"""
    print("\n" + "="*60)
    print("TEST 3: Agent Metadata SOCKS Port")
    print("="*60)
    
    try:
        import requests
        import time
        
        # Wait for database commit
        time.sleep(2)
        
        # Login to get token
        login_resp = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            data={"username": "admin", "password": "admin123"}
        )
        token = login_resp.json()["access_token"]
        
        # Get agent details
        agent_resp = requests.get(
            f"http://localhost:8000/api/v1/agents/{agent_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        agent_data = agent_resp.json()
        
        metadata_port = agent_data.get("agent_metadata", {}).get("socks_proxy_port")
        if metadata_port == socks_port:
            print(f"✅ Agent metadata contains correct SOCKS port: {metadata_port}")
            return True
        else:
            print(f"❌ SOCKS port mismatch:")
            print(f"   Expected: {socks_port}")
            print(f"   Got: {metadata_port}")
            print(f"   Full metadata: {agent_data.get('agent_metadata')}")
            return False
            
    except Exception as e:
        print(f"❌ Test 3 failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pov_mode_scan(agent_id):
    """Test 4: POV mode scan through API"""
    print("\n" + "="*60)
    print("TEST 4: POV Mode Port Scan")
    print("="*60)
    
    try:
        import requests
        
        # Login
        login_resp = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            data={"username": "admin", "password": "admin123"}
        )
        token = login_resp.json()["access_token"]
        
        # Run POV scan
        print(f"Scanning {TEST_TARGET} via agent POV...")
        scan_resp = requests.post(
            f"http://localhost:8000/api/v1/discovery/port-scan/{TEST_TARGET}",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Agent-POV": agent_id
            },
            params={"ports": "5432"}  # PostgreSQL port
        )
        
        if scan_resp.status_code == 200:
            result = scan_resp.json()
            print(f"✅ POV scan completed")
            print(f"   Target: {TEST_TARGET}")
            print(f"   Agent POV: {agent_id}")
            print(f"   Result: {result}")
            return True
        else:
            print(f"❌ POV scan failed: {scan_resp.status_code}")
            print(f"   Response: {scan_resp.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test 4 failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all E2E tests"""
    print("\n" + "="*60)
    print("SOCKS Integration E2E Test Suite")
    print("="*60)
    
    results = {
        "websocket_connection": False,
        "socks_proxy_listening": False,
        "agent_metadata": False,
        "pov_mode_scan": False
    }
    
    # Test 1: WebSocket connection
    socks_port, agent_id = await test_websocket_connection()
    if socks_port and agent_id:
        results["websocket_connection"] = True
        
        # Test 2: SOCKS proxy listening
        time.sleep(2)  # Give proxy time to start
        if test_socks_proxy_port(socks_port):
            results["socks_proxy_listening"] = True
        
        # Test 3: Agent metadata
        if test_agent_metadata(agent_id, socks_port):
            results["agent_metadata"] = True
        
        # Test 4: POV mode scan (would need actual agent to relay)
        # Skipping for now as we need a real agent running
        # if test_pov_mode_scan(agent_id):
        #     results["pov_mode_scan"] = True
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    total_passed = sum(results.values())
    total_tests = len(results)
    print(f"\nTotal: {total_passed}/{total_tests} tests passed")
    
    return total_passed == total_tests


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
