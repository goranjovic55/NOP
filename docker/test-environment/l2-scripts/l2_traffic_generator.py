#!/usr/bin/env python3
"""
L2 Traffic Generator - Master script for generating L2 protocol traffic
Usage: python3 l2_traffic_generator.py --mode all
       python3 l2_traffic_generator.py --mode stp --stp-priority 8192
"""
import argparse
import subprocess
import sys
import time
import threading
import os
import signal

# Directory containing all L2 scripts
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

class L2TrafficGenerator:
    def __init__(self, interface='eth0'):
        self.interface = interface
        self.processes = []
        self.running = True
        
    def start_script(self, script_name, args=None):
        """Start a traffic generator script"""
        script_path = os.path.join(SCRIPT_DIR, script_name)
        cmd = ['python3', script_path, '--interface', self.interface]
        if args:
            cmd.extend(args)
        
        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            self.processes.append((script_name, proc))
            print(f"[L2-GEN] Started {script_name} (PID: {proc.pid})")
            return proc
        except Exception as e:
            print(f"[L2-GEN] Failed to start {script_name}: {e}")
            return None
    
    def stop_all(self):
        """Stop all running generators"""
        self.running = False
        for name, proc in self.processes:
            try:
                proc.terminate()
                proc.wait(timeout=2)
                print(f"[L2-GEN] Stopped {name}")
            except:
                proc.kill()
        self.processes = []
    
    def run_stp(self, priority=32768, root=False):
        """Run STP bridge simulator"""
        args = ['--priority', str(priority)]
        if root:
            args.append('--root')
        self.start_script('stp_bridge.py', args)
    
    def run_lldp(self, system_name=None, mgmt_ip=None):
        """Run LLDP sender"""
        args = []
        if system_name:
            args.extend(['--system-name', system_name])
        if mgmt_ip:
            args.extend(['--mgmt-ip', mgmt_ip])
        self.start_script('lldp_sender.py', args)
    
    def run_vlan(self, vlan_id=10, mode='icmp'):
        """Run VLAN traffic generator"""
        args = ['--vlan-id', str(vlan_id), '--mode', mode]
        self.start_script('vlan_traffic.py', args)
    
    def run_cdp(self, device_id=None, platform=None):
        """Run CDP sender"""
        args = []
        if device_id:
            args.extend(['--device-id', device_id])
        if platform:
            args.extend(['--platform', platform])
        self.start_script('cdp_sender.py', args)
    
    def run_ring(self, protocol='rep', node_id=1, ring_id=1):
        """Run ring protocol simulator"""
        args = ['--protocol', protocol, '--node-id', str(node_id), '--ring-id', str(ring_id)]
        self.start_script('ring_protocol.py', args)
    
    def run_all_protocols(self):
        """Run all L2 protocols for comprehensive testing"""
        print("[L2-GEN] Starting all L2 protocol generators...")
        
        # Start STP
        self.run_stp(priority=32768)
        time.sleep(0.5)
        
        # Start LLDP
        self.run_lldp(system_name='L2-Test-Switch', mgmt_ip='172.30.0.100')
        time.sleep(0.5)
        
        # Start VLAN traffic
        self.run_vlan(vlan_id=10, mode='icmp')
        time.sleep(0.5)
        
        # Start CDP
        self.run_cdp(device_id='L2-Test-Router', platform='Linux')
        time.sleep(0.5)
        
        # Start Ring protocol (REP)
        self.run_ring(protocol='rep', node_id=1)
        
        print("[L2-GEN] All generators started!")
    
    def monitor(self):
        """Monitor running processes"""
        while self.running:
            time.sleep(5)
            active = [(name, proc) for name, proc in self.processes if proc.poll() is None]
            if len(active) != len(self.processes):
                print(f"[L2-GEN] Active generators: {len(active)}/{len(self.processes)}")
            self.processes = active

def main():
    parser = argparse.ArgumentParser(description='L2 Traffic Generator')
    parser.add_argument('--mode', type=str, default='all',
                        choices=['all', 'stp', 'lldp', 'vlan', 'cdp', 'ring'],
                        help='Traffic mode')
    parser.add_argument('--interface', type=str, default='eth0', help='Network interface')
    
    # STP options
    parser.add_argument('--stp-priority', type=int, default=32768, help='STP priority')
    parser.add_argument('--stp-root', action='store_true', help='Act as root bridge')
    
    # LLDP options
    parser.add_argument('--system-name', type=str, help='LLDP system name')
    parser.add_argument('--mgmt-ip', type=str, help='Management IP')
    
    # VLAN options
    parser.add_argument('--vlan-id', type=int, default=10, help='VLAN ID')
    parser.add_argument('--vlan-mode', type=str, default='icmp', 
                        choices=['icmp', 'udp', 'arp'], help='VLAN traffic type')
    
    # CDP options
    parser.add_argument('--device-id', type=str, help='CDP device ID')
    parser.add_argument('--platform', type=str, help='CDP platform')
    
    # Ring options
    parser.add_argument('--ring-protocol', type=str, default='rep',
                        choices=['rep', 'mrp', 'dlr', 'prp', 'hsr'], help='Ring protocol')
    parser.add_argument('--node-id', type=int, default=1, help='Ring node ID')
    parser.add_argument('--ring-id', type=int, default=1, help='Ring ID')
    
    args = parser.parse_args()
    
    generator = L2TrafficGenerator(interface=args.interface)
    
    def signal_handler(sig, frame):
        print("\n[L2-GEN] Shutting down...")
        generator.stop_all()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        if args.mode == 'all':
            generator.run_all_protocols()
        elif args.mode == 'stp':
            generator.run_stp(priority=args.stp_priority, root=args.stp_root)
        elif args.mode == 'lldp':
            generator.run_lldp(system_name=args.system_name, mgmt_ip=args.mgmt_ip)
        elif args.mode == 'vlan':
            generator.run_vlan(vlan_id=args.vlan_id, mode=args.vlan_mode)
        elif args.mode == 'cdp':
            generator.run_cdp(device_id=args.device_id, platform=args.platform)
        elif args.mode == 'ring':
            generator.run_ring(protocol=args.ring_protocol, node_id=args.node_id, 
                              ring_id=args.ring_id)
        
        # Keep running and monitoring
        generator.monitor()
        
    except KeyboardInterrupt:
        pass
    finally:
        generator.stop_all()

if __name__ == "__main__":
    main()
