package main

/*
NOP Agent - {{AGENT_NAME}}
Generated: {{GENERATED_TIME}}
Type: Go Proxy Agent
Encryption: AES-256-GCM (Encrypted tunnel to C2)

This agent acts as a proxy, relaying all data from the remote network
back to the NOP C2 server. All modules run here but data is processed
on the main NOP instance.

Build commands:
  Linux:   GOOS=linux GOARCH=amd64 go build -o nop-agent-linux
  Windows: GOOS=windows GOARCH=amd64 go build -o nop-agent.exe
  macOS:   GOOS=darwin GOARCH=amd64 go build -o nop-agent-macos
  ARM:     GOOS=linux GOARCH=arm64 go build -o nop-agent-arm
*/

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"golang.org/x/crypto/pbkdf2"
)

const (
	AgentID       = "{{AGENT_ID}}"
	AgentName     = "{{AGENT_NAME}}"
	AuthToken     = "{{AUTH_TOKEN}}"
	EncryptionKey = "{{ENCRYPTION_KEY}}"
	ServerURL     = "{{SERVER_URL}}"
)

var Capabilities = map[string]bool{{CAPABILITIES}}

var Config = map[string]interface{}{{CONFIG}}

type NOPAgent struct {
	conn            *websocket.Conn
	agentID         string
	agentName       string
	authToken       string
	encryptionKey   []byte
	serverURL       string
	capabilities    map[string]bool
	config          map[string]interface{}
	running         bool
	cipher          cipher.AEAD
	passiveHosts    []map[string]interface{}
	hostsMutex      sync.Mutex
	connMutex       sync.Mutex
}

type Message struct {
	Type       string                 `json:"type"`
	AgentID    string                 `json:"agent_id,omitempty"`
	AgentName  string                 `json:"agent_name,omitempty"`
	Encrypted  bool                   `json:"encrypted,omitempty"`
	Data       interface{}            `json:"data,omitempty"`
	Timestamp  string                 `json:"timestamp,omitempty"`
	Message    string                 `json:"message,omitempty"`
	SystemInfo map[string]interface{} `json:"system_info,omitempty"`
}

type AssetData struct {
	Type      string                   `json:"type"`
	AgentID   string                   `json:"agent_id"`
	Assets    []map[string]interface{} `json:"assets"`
	Timestamp string                   `json:"timestamp"`
}

type TrafficData struct {
	Type      string                 `json:"type"`
	AgentID   string                 `json:"agent_id"`
	Traffic   map[string]interface{} `json:"traffic"`
	Timestamp string                 `json:"timestamp"`
}

type HostData struct {
	Type      string                 `json:"type"`
	AgentID   string                 `json:"agent_id"`
	Host      map[string]interface{} `json:"host"`
	Timestamp string                 `json:"timestamp"`
}

func NewNOPAgent() *NOPAgent {
	agent := &NOPAgent{
		agentID:       AgentID,
		agentName:     AgentName,
		authToken:     AuthToken,
		encryptionKey: []byte(EncryptionKey),
		serverURL:     ServerURL,
		capabilities:  Capabilities,
		config:        Config,
		running:       true,
		passiveHosts:  make([]map[string]interface{}, 0),
	}
	agent.initCipher()
	return agent
}

func (a *NOPAgent) initCipher() {
	// Derive key using PBKDF2
	salt := []byte("nop_c2_salt_2026")
	key := pbkdf2.Key(a.encryptionKey, salt, 100000, 32, sha256.New)

	block, err := aes.NewCipher(key)
	if err != nil {
		log.Printf("[%s] Cipher init error: %v", time.Now().Format(time.RFC3339), err)
		return
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		log.Printf("[%s] GCM init error: %v", time.Now().Format(time.RFC3339), err)
		return
	}

	a.cipher = gcm
}

func (a *NOPAgent) encryptMessage(data string) (string, error) {
	nonce := make([]byte, a.cipher.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := a.cipher.Seal(nonce, nonce, []byte(data), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (a *NOPAgent) decryptMessage(encryptedData string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encryptedData)
	if err != nil {
		return "", err
	}

	nonceSize := a.cipher.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := a.cipher.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func (a *NOPAgent) sendEncrypted(message interface{}) error {
	jsonStr, err := json.Marshal(message)
	if err != nil {
		return err
	}

	encrypted, err := a.encryptMessage(string(jsonStr))
	if err != nil {
		return err
	}

	encryptedMsg := map[string]interface{}{
		"encrypted": true,
		"data":      encrypted,
	}

	a.connMutex.Lock()
	defer a.connMutex.Unlock()
	return a.conn.WriteJSON(encryptedMsg)
}

func (a *NOPAgent) Connect() error {
	log.Printf("[%s] Connecting to C2 server: %s", time.Now().Format(time.RFC3339), a.serverURL)

	u, err := url.Parse(a.serverURL)
	if err != nil {
		return fmt.Errorf("invalid server URL: %v", err)
	}

	header := make(map[string][]string)
	header["Authorization"] = []string{fmt.Sprintf("Bearer %s", a.authToken)}

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.Dial(u.String(), header)
	if err != nil {
		return fmt.Errorf("connection failed: %v", err)
	}

	a.conn = conn
	log.Printf("[%s] Connected! Establishing encrypted tunnel...", time.Now().Format(time.RFC3339))

	return nil
}

func (a *NOPAgent) Register() error {
	hostname, _ := os.Hostname()

	// Get IP addresses
	addrs, _ := net.InterfaceAddrs()
	var primaryIP string
	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
			primaryIP = ipnet.IP.String()
			break
		}
	}

	reg := Message{
		Type:      "register",
		AgentID:   a.agentID,
		AgentName: a.agentName,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Data: map[string]interface{}{
			"capabilities": a.capabilities,
		},
		SystemInfo: map[string]interface{}{
			"hostname":   hostname,
			"platform":   runtime.GOOS,
			"version":    runtime.Version(),
			"ip_address": primaryIP,
			"arch":       runtime.GOARCH,
		},
	}

	a.connMutex.Lock()
	err := a.conn.WriteJSON(reg)
	a.connMutex.Unlock()

	if err != nil {
		return fmt.Errorf("registration failed: %v", err)
	}

	log.Printf("[%s] Registered with C2 server", time.Now().Format(time.RFC3339))
	return nil
}

func (a *NOPAgent) Heartbeat() {
	interval := 30 * time.Second
	if val, ok := a.config["heartbeat_interval"]; ok {
		if i, ok := val.(float64); ok {
			interval = time.Duration(i) * time.Second
		}
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for a.running {
		select {
		case <-ticker.C:
			hb := Message{
				Type:      "heartbeat",
				AgentID:   a.agentID,
				Timestamp: time.Now().UTC().Format(time.RFC3339),
			}
			a.connMutex.Lock()
			err := a.conn.WriteJSON(hb)
			a.connMutex.Unlock()
			if err != nil {
				log.Printf("[%s] Heartbeat error: %v", time.Now().Format(time.RFC3339), err)
				return
			}
		}
	}
}

func (a *NOPAgent) MessageHandler() {
	for a.running {
		var msg map[string]interface{}
		err := a.conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("[%s] Read error: %v", time.Now().Format(time.RFC3339), err)
			return
		}

		msgType, _ := msg["type"].(string)

		switch msgType {
		case "terminate":
			log.Printf("[%s] Terminate command received from C2", time.Now().Format(time.RFC3339))
			if message, ok := msg["message"].(string); ok {
				log.Printf("[%s] Message: %s", time.Now().Format(time.RFC3339), message)
			}
			a.running = false
			return

		case "kill":
			log.Printf("[%s] KILL command received - Self-destructing...", time.Now().Format(time.RFC3339))
			if message, ok := msg["message"].(string); ok {
				log.Printf("[%s] Message: %s", time.Now().Format(time.RFC3339), message)
			}
			a.running = false
			// Attempt to delete self
			executable, err := os.Executable()
			if err == nil {
				log.Printf("[%s] Deleting agent file: %s", time.Now().Format(time.RFC3339), executable)
				os.Remove(executable)
			}
			return

		case "command":
			a.handleCommand(msg)

		case "ping":
			a.sendPong()

		case "settings_update":
			a.handleSettingsUpdate(msg)
		}
	}
}

func (a *NOPAgent) handleCommand(msg map[string]interface{}) {
	if cmd, ok := msg["command"].(string); ok {
		log.Printf("[%s] Received command: %s", time.Now().Format(time.RFC3339), cmd)
	}
}

func (a *NOPAgent) handleSettingsUpdate(msg map[string]interface{}) {
	if settings, ok := msg["settings"].(map[string]interface{}); ok {
		log.Printf("[%s] Settings update received from C2", time.Now().Format(time.RFC3339))
		// Update config with new settings
		for k, v := range settings {
			a.config[k] = v
		}
	}
}

func (a *NOPAgent) sendPong() {
	pong := Message{
		Type:      "pong",
		AgentID:   a.agentID,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	a.connMutex.Lock()
	a.conn.WriteJSON(pong)
	a.connMutex.Unlock()
}

func (a *NOPAgent) relayToC2(data interface{}) {
	a.connMutex.Lock()
	defer a.connMutex.Unlock()
	if a.conn != nil {
		if err := a.conn.WriteJSON(data); err != nil {
			log.Printf("[%s] Relay error: %v", time.Now().Format(time.RFC3339), err)
		}
	}
}

// ============================================================================
// ASSET MODULE - Network asset discovery and monitoring
// ============================================================================
func (a *NOPAgent) AssetModule() {
	if !a.capabilities["asset"] {
		return
	}
	log.Printf("[%s] Asset module started", time.Now().Format(time.RFC3339))

	interval := 300 * time.Second
	if val, ok := a.config["discovery_interval"]; ok {
		if i, ok := val.(float64); ok && i > 0 {
			interval = time.Duration(i) * time.Second
		}
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Initial discovery
	a.discoverAssets()

	for a.running {
		select {
		case <-ticker.C:
			a.discoverAssets()
		}
	}
}

func (a *NOPAgent) discoverAssets() {
	assets := make([]map[string]interface{}, 0)

	// Get all network interfaces
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Printf("[%s] Asset discovery error: %v", time.Now().Format(time.RFC3339), err)
		return
	}

	// Collect local interface info as assets
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ipnet, ok := addr.(*net.IPNet)
			if !ok || ipnet.IP.To4() == nil {
				continue
			}

			asset := map[string]interface{}{
				"ip":            ipnet.IP.String(),
				"mac":           iface.HardwareAddr.String(),
				"status":        "online",
				"discovered_at": time.Now().UTC().Format(time.RFC3339),
				"interface":     iface.Name,
			}
			assets = append(assets, asset)
		}
	}

	// Try to discover local network hosts via ARP table
	arpAssets := a.getArpTable()
	assets = append(assets, arpAssets...)

	// Add passively discovered hosts
	a.hostsMutex.Lock()
	assets = append(assets, a.passiveHosts...)
	a.passiveHosts = make([]map[string]interface{}, 0)
	a.hostsMutex.Unlock()

	if len(assets) > 0 {
		log.Printf("[%s] Discovered %d assets", time.Now().Format(time.RFC3339), len(assets))
		a.relayToC2(AssetData{
			Type:      "asset_data",
			AgentID:   a.agentID,
			Assets:    assets,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		})
	}
}

func (a *NOPAgent) getArpTable() []map[string]interface{} {
	assets := make([]map[string]interface{}, 0)

	// Read ARP table from /proc/net/arp on Linux
	if runtime.GOOS == "linux" {
		data, err := os.ReadFile("/proc/net/arp")
		if err != nil {
			return assets
		}

		lines := strings.Split(string(data), "\n")
		for i, line := range lines {
			if i == 0 { // Skip header
				continue
			}
			fields := strings.Fields(line)
			if len(fields) >= 4 {
				ip := fields[0]
				mac := fields[3]
				if mac != "00:00:00:00:00:00" && ip != "" {
					assets = append(assets, map[string]interface{}{
						"ip":            ip,
						"mac":           mac,
						"status":        "online",
						"discovered_at": time.Now().UTC().Format(time.RFC3339),
						"method":        "arp_table",
					})
				}
			}
		}
	} else if runtime.GOOS == "windows" {
		// On Windows, use arp -a command
		cmd := exec.Command("arp", "-a")
		output, err := cmd.Output()
		if err == nil {
			lines := strings.Split(string(output), "\n")
			for _, line := range lines {
				fields := strings.Fields(line)
				if len(fields) >= 2 {
					ip := fields[0]
					if net.ParseIP(ip) != nil && len(fields) >= 2 {
						mac := fields[1]
						assets = append(assets, map[string]interface{}{
							"ip":            ip,
							"mac":           mac,
							"status":        "online",
							"discovered_at": time.Now().UTC().Format(time.RFC3339),
							"method":        "arp_table",
						})
					}
				}
			}
		}
	}

	return assets
}

// ============================================================================
// TRAFFIC MODULE - Network traffic monitoring and analysis
// ============================================================================
func (a *NOPAgent) TrafficModule() {
	if !a.capabilities["traffic"] {
		return
	}
	log.Printf("[%s] Traffic module started", time.Now().Format(time.RFC3339))

	interval := 60 * time.Second
	if val, ok := a.config["data_interval"]; ok {
		if i, ok := val.(float64); ok && i > 0 {
			interval = time.Duration(i) * time.Second
		}
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for a.running {
		select {
		case <-ticker.C:
			stats := a.captureTrafficStats()
			a.relayToC2(TrafficData{
				Type:      "traffic_data",
				AgentID:   a.agentID,
				Traffic:   stats,
				Timestamp: time.Now().UTC().Format(time.RFC3339),
			})
		}
	}
}

func (a *NOPAgent) captureTrafficStats() map[string]interface{} {
	stats := make(map[string]interface{})

	netStats, err := psnet.IOCounters(false) // false = aggregated stats
	if err != nil {
		log.Printf("[%s] Traffic capture error: %v", time.Now().Format(time.RFC3339), err)
		return stats
	}

	if len(netStats) > 0 {
		stats["bytes_sent"] = netStats[0].BytesSent
		stats["bytes_recv"] = netStats[0].BytesRecv
		stats["packets_sent"] = netStats[0].PacketsSent
		stats["packets_recv"] = netStats[0].PacketsRecv
		stats["errors_in"] = netStats[0].Errin
		stats["errors_out"] = netStats[0].Errout
	}

	return stats
}

// ============================================================================
// HOST MODULE - Host system information and monitoring
// ============================================================================
func (a *NOPAgent) HostModule() {
	if !a.capabilities["host"] {
		return
	}
	log.Printf("[%s] Host module started", time.Now().Format(time.RFC3339))

	interval := 120 * time.Second
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Send initial host info
	a.sendHostInfo()

	for a.running {
		select {
		case <-ticker.C:
			a.sendHostInfo()
		}
	}
}

func (a *NOPAgent) sendHostInfo() {
	hostInfo := a.collectHostInfo()
	a.relayToC2(HostData{
		Type:      "host_data",
		AgentID:   a.agentID,
		Host:      hostInfo,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

func (a *NOPAgent) collectHostInfo() map[string]interface{} {
	info := make(map[string]interface{})

	// Hostname
	hostname, _ := os.Hostname()
	info["hostname"] = hostname

	// Platform info
	info["platform"] = runtime.GOOS
	info["architecture"] = runtime.GOARCH
	info["go_version"] = runtime.Version()

	// Host info from gopsutil
	hostInfo, err := host.Info()
	if err == nil {
		info["platform_release"] = hostInfo.Platform
		info["platform_version"] = hostInfo.PlatformVersion
		info["os"] = hostInfo.OS
		info["kernel_version"] = hostInfo.KernelVersion
		info["boot_time"] = time.Unix(int64(hostInfo.BootTime), 0).Format(time.RFC3339)
	}

	// CPU
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuPercent) > 0 {
		info["cpu_percent"] = cpuPercent[0]
	}

	// Memory
	memInfo, err := mem.VirtualMemory()
	if err == nil {
		info["memory_percent"] = memInfo.UsedPercent
		info["memory_total"] = memInfo.Total
		info["memory_used"] = memInfo.Used
	}

	// Disk
	diskInfo, err := disk.Usage("/")
	if err == nil {
		info["disk_percent"] = diskInfo.UsedPercent
		info["disk_total"] = diskInfo.Total
		info["disk_used"] = diskInfo.Used
	}

	// Network interfaces
	interfaces := make([]map[string]interface{}, 0)
	ifaces, err := net.Interfaces()
	if err == nil {
		for _, iface := range ifaces {
			if iface.Flags&net.FlagUp == 0 {
				continue
			}
			addrs, _ := iface.Addrs()
			for _, addr := range addrs {
				ipnet, ok := addr.(*net.IPNet)
				if !ok || ipnet.IP.To4() == nil {
					continue
				}
				interfaces = append(interfaces, map[string]interface{}{
					"name":   iface.Name,
					"ip":     ipnet.IP.String(),
					"status": "up",
				})
			}
		}
	}
	info["interfaces"] = interfaces

	return info
}

// ============================================================================
// ACCESS MODULE - Remote access and command execution
// ============================================================================
func (a *NOPAgent) AccessModule() {
	if !a.capabilities["access"] {
		return
	}
	log.Printf("[%s] Access module started (listen-only mode)", time.Now().Format(time.RFC3339))
	// Access module only responds to C2 commands for security
	// No autonomous actions
}

// ============================================================================
// MAIN
// ============================================================================
func (a *NOPAgent) Run() {
	log.Printf("[%s] NOP Agent '%s' starting...", time.Now().Format(time.RFC3339), a.agentName)

	enabled := make([]string, 0)
	for module, isEnabled := range a.capabilities {
		if isEnabled {
			enabled = append(enabled, module)
		}
	}
	log.Printf("[%s] Enabled modules: %v", time.Now().Format(time.RFC3339), enabled)

	for a.running {
		if err := a.Connect(); err != nil {
			log.Printf("[%s] Connection error: %v", time.Now().Format(time.RFC3339), err)
			time.Sleep(5 * time.Second)
			continue
		}

		if err := a.Register(); err != nil {
			log.Printf("[%s] Registration error: %v", time.Now().Format(time.RFC3339), err)
			time.Sleep(5 * time.Second)
			continue
		}

		// Start modules in goroutines
		go a.Heartbeat()
		go a.AssetModule()
		go a.TrafficModule()
		go a.HostModule()
		go a.AccessModule()

		// Handle messages (blocking)
		a.MessageHandler()

		if a.conn != nil {
			a.conn.Close()
		}

		if a.running {
			log.Printf("[%s] Reconnecting in 5 seconds...", time.Now().Format(time.RFC3339))
			time.Sleep(5 * time.Second)
		}
	}
}

func main() {
	agent := NewNOPAgent()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Printf("[%s] Agent stopped by user", time.Now().Format(time.RFC3339))
		agent.running = false
		if agent.conn != nil {
			agent.conn.Close()
		}
		os.Exit(0)
	}()

	agent.Run()
}
