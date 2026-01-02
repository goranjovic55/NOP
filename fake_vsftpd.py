import socket
import threading
import time
import subprocess
import os

def handle_ftp(conn):
    conn.send(b"220 (vsFTPd 2.3.4)\r\n")
    while True:
        data = conn.recv(1024)
        if not data: break
        cmd = data.strip()
        print(f"FTP CMD: {cmd}")
        if cmd.startswith(b"USER"):
            if b":)" in cmd:
                print("Backdoor triggered!")
                threading.Thread(target=start_backdoor).start()
            conn.send(b"331 Please specify the password.\r\n")
        elif cmd.startswith(b"PASS"):
            conn.send(b"230 Login successful.\r\n")
        else:
            conn.send(b"500 Unknown command.\r\n")
    conn.close()

def start_backdoor():
    # Listen on 6200
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(('0.0.0.0', 6200))
        s.listen(1)
        print("Backdoor listening on 6200")
        conn, addr = s.accept()
        print(f"Backdoor connected from {addr}")
        
        # Simple shell simulation
        while True:
            data = conn.recv(1024)
            if not data: break
            cmd = data.decode().strip()
            print(f"Shell CMD: {cmd}")
            try:
                output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT)
                conn.send(output)
            except Exception as e:
                conn.send(str(e).encode() + b"\n")
        conn.close()
        s.close()
    except Exception as e:
        print(f"Backdoor error: {e}")

def main():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind(('0.0.0.0', 21))
    except PermissionError:
        print("Cannot bind to port 21. Trying 2121.")
        s.bind(('0.0.0.0', 2121))
        
    s.listen(5)
    print("Fake vsftpd listening...")
    
    while True:
        conn, addr = s.accept()
        print(f"FTP connection from {addr}")
        threading.Thread(target=handle_ftp, args=(conn,)).start()

if __name__ == "__main__":
    main()
