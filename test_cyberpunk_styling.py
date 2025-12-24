#!/usr/bin/env python3
"""
Test script to verify the cyberpunk styling implementation
"""

import requests
import time
import sys

def test_frontend_accessibility():
    """Test if the frontend is accessible with new styling"""
    try:
        print("🔍 Testing frontend accessibility...")
        response = requests.get("http://localhost:12001", timeout=10)
        
        if response.status_code == 200:
            print("✅ Frontend is accessible")
            
            # Check for cyberpunk-specific elements in the HTML
            html_content = response.text.lower()
            
            cyberpunk_indicators = [
                'jetbrains mono',  # Terminal font
                'cyber-',          # Cyberpunk CSS classes
                '#ff0040',         # Cyberpunk red color
                '#8b5cf6',         # Cyberpunk purple color
                'font-terminal',   # Terminal font class
                'cyber-glow',      # Glow effects
            ]
            
            found_indicators = []
            for indicator in cyberpunk_indicators:
                if indicator in html_content:
                    found_indicators.append(indicator)
            
            print(f"✅ Found {len(found_indicators)}/{len(cyberpunk_indicators)} cyberpunk styling indicators")
            
            if len(found_indicators) >= 3:
                print("🎯 Cyberpunk styling successfully implemented!")
                return True
            else:
                print("⚠️  Some cyberpunk styling elements may be missing")
                return False
        else:
            print(f"❌ Frontend returned status code: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to connect to frontend: {e}")
        return False

def test_backend_connectivity():
    """Test if backend is still working"""
    try:
        print("🔍 Testing backend connectivity...")
        response = requests.get("http://localhost:12000/health", timeout=5)
        
        if response.status_code == 200:
            print("✅ Backend is accessible")
            return True
        else:
            print(f"❌ Backend returned status code: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to connect to backend: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Testing Network Observatory Platform - Cyberpunk Edition")
    print("=" * 60)
    
    # Wait for services to be ready
    print("⏳ Waiting for services to initialize...")
    time.sleep(5)
    
    tests_passed = 0
    total_tests = 2
    
    # Test frontend
    if test_frontend_accessibility():
        tests_passed += 1
    
    print()
    
    # Test backend
    if test_backend_connectivity():
        tests_passed += 1
    
    print()
    print("=" * 60)
    print(f"🎯 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Cyberpunk styling is working correctly.")
        print("🌐 Access the platform at: https://work-2-ofbjpopkbjxtwxgp.prod-runtime.all-hands.dev")
        return 0
    else:
        print("⚠️  Some tests failed. Check the logs above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())