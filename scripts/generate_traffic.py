import subprocess
import time
import random

def run_command(cmd):
    try:
        subprocess.run(cmd, shell=True, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def generate_traffic():
    print("Starting traffic generation... Press Ctrl+C to stop.")
    
    targets = [
        ("nop-backend-1", "172.21.0.42", "80"),   # Backend -> Web
        ("nop-backend-1", "172.21.0.52", "21"),   # Backend -> FTP
        ("nop-custom-web", "172.21.0.123", "3306"), # Web -> DB
        ("nop-custom-web", "172.21.0.200", "445"),  # Web -> File
        ("nop-custom-ssh", "172.21.0.42", "80"),    # SSH -> Web
    ]

    while True:
        source, target_ip, port = random.choice(targets)
        print(f"Generating traffic: {source} -> {target_ip}:{port}")
        
        if port == "80":
            cmd = f"docker exec {source} curl -s --connect-timeout 2 http://{target_ip}"
        elif port == "21":
            cmd = f"docker exec {source} curl -s --connect-timeout 2 ftp://{target_ip}"
        else:
            # Generic TCP connection attempt using curl (it will fail protocol check but generate TCP traffic)
            cmd = f"docker exec {source} curl -s --connect-timeout 2 http://{target_ip}:{port}"
            
        run_command(cmd)
        time.sleep(1)

if __name__ == "__main__":
    generate_traffic()
