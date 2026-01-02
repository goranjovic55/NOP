"""
Settings schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Literal


class ScanSettingsConfig(BaseModel):
    """Scan settings configuration"""
    # Profile
    profile_name: str = Field(default="Default Scan", description="Profile name for this scan configuration")
    profile_description: str = Field(default="", description="Description of this scan profile")
    
    # Port scanning
    port_scan_enabled: bool = Field(default=False, description="Enable port scanning")
    port_scan_type: Literal["quick", "full", "custom"] = Field(default="quick", description="Port scan type")
    custom_ports: str = Field(default="22,80,443,3389", description="Custom ports to scan")
    port_scan_timeout: int = Field(default=5, ge=1, le=60, description="Port scan timeout in seconds")
    tcp_scan_enabled: bool = Field(default=True, description="Enable TCP port scanning")
    udp_scan_enabled: bool = Field(default=False, description="Enable UDP port scanning")
    syn_scan: bool = Field(default=True, description="Use SYN scan (stealth)")
    
    # Vulnerability scanning
    vuln_scan_enabled: bool = Field(default=False, description="Enable vulnerability scanning")
    vuln_scan_depth: Literal["basic", "standard", "deep"] = Field(default="standard", description="Vulnerability scan depth")
    safe_checks_only: bool = Field(default=True, description="Only perform safe vulnerability checks")
    check_cve_database: bool = Field(default=True, description="Check against CVE database")
    detect_versions: bool = Field(default=True, description="Detect service versions")
    
    # Performance
    max_concurrent_scans: int = Field(default=5, ge=1, le=50, description="Maximum concurrent scans")
    scan_throttle: int = Field(default=100, ge=10, le=1000, description="Packets per second throttle")
    retry_attempts: int = Field(default=3, ge=1, le=10, description="Number of retry attempts")
    parallel_threads: int = Field(default=10, ge=1, le=100, description="Number of parallel scanning threads")
    
    # Scheduling
    auto_scan_enabled: bool = Field(default=False, description="Enable automatic scanning")
    auto_scan_interval: int = Field(default=60, ge=5, le=1440, description="Auto scan interval in minutes")
    auto_scan_schedule: str = Field(default="0 2 * * *", description="Cron schedule for scans")
    
    # Reporting
    generate_reports: bool = Field(default=True, description="Generate scan reports")
    report_format: Literal["pdf", "html", "json", "all"] = Field(default="all", description="Report format")
    verbose_output: bool = Field(default=False, description="Include verbose details in reports")


class DiscoverySettingsConfig(BaseModel):
    """Discovery settings configuration"""
    # Profile
    profile_name: str = Field(default="Default Discovery", description="Profile name for this discovery configuration")
    profile_description: str = Field(default="", description="Description of this discovery profile")
    
    # Discovery method
    discovery_enabled: bool = Field(default=True, description="Enable network discovery")
    discovery_method: Literal["arp", "ping", "both"] = Field(default="arp", description="Discovery method")
    network_range: str = Field(default="172.21.0.0/24", description="Network range to scan")
    
    # Timing
    discovery_interval: int = Field(default=5, ge=1, le=60, description="Discovery interval in minutes")
    packets_per_second: int = Field(default=100, ge=10, le=1000, description="Packets per second")
    discovery_timeout: int = Field(default=30, ge=5, le=300, description="Discovery timeout in seconds")
    ping_retries: int = Field(default=3, ge=1, le=10, description="Number of ping retries")
    
    # Advanced options
    enable_dns_resolution: bool = Field(default=True, description="Enable DNS resolution")
    enable_os_detection: bool = Field(default=False, description="Enable OS detection")
    enable_service_detection: bool = Field(default=False, description="Enable service detection")
    passive_discovery: bool = Field(default=True, description="Enable passive discovery")
    track_source_only: bool = Field(default=True, description="Track only source IPs (safer, no false positives). When disabled, tracks both source and destination IPs with filtering options below")
    
    # Granular filtering options (only used when track_source_only=False)
    filter_unicast: bool = Field(default=False, description="Filter unicast destination IPs. When False, can detect hosts receiving unicast traffic (passive listeners)")
    filter_multicast: bool = Field(default=True, description="Filter multicast destination IPs (224.0.0.0/4). Recommended: True")
    filter_broadcast: bool = Field(default=True, description="Filter broadcast destination IPs (255.255.255.255 and network broadcasts). Recommended: True")
    
    fingerprint_os: bool = Field(default=False, description="Perform OS fingerprinting")
    detect_vpn: bool = Field(default=False, description="Attempt to detect VPN connections")
    
    # Network interfaces
    interface_name: str = Field(default="eth0", description="Network interface to use")
    promiscuous_mode: bool = Field(default=False, description="Enable promiscuous mode")
    
    # Filters
    exclude_ranges: str = Field(default="", description="Exclude IP ranges (comma-separated)")
    include_only_ranges: str = Field(default="", description="Include only these ranges (comma-separated)")
    min_response_time: int = Field(default=0, ge=0, le=10000, description="Minimum response time filter (ms)")
    max_response_time: int = Field(default=5000, ge=100, le=30000, description="Maximum response time filter (ms)")


class AccessSettingsConfig(BaseModel):
    """Access control settings configuration"""
    # Authentication settings - local authentication only for single-system deployment
    session_timeout: int = Field(default=60, ge=5, le=480, description="Session timeout in minutes")
    max_login_attempts: int = Field(default=5, ge=3, le=10, description="Maximum login attempts")
    lockout_duration: int = Field(default=30, ge=5, le=120, description="Account lockout duration in minutes")
    
    # Credential vault
    enable_credential_vault: bool = Field(default=True, description="Enable credential vault for saved connections")
    vault_timeout: int = Field(default=15, ge=1, le=60, description="Vault auto-lock timeout in minutes")
    require_password_for_vault: bool = Field(default=True, description="Require password re-entry to access vault")
    
    # API access
    api_access_enabled: bool = Field(default=True, description="Enable API access")
    api_rate_limit: int = Field(default=100, ge=10, le=1000, description="API rate limit per minute")
    
    # Audit logging
    log_all_access: bool = Field(default=True, description="Log all access attempts")
    log_failed_attempts: bool = Field(default=True, description="Log failed login attempts")
    retention_days: int = Field(default=90, ge=30, le=365, description="Log retention in days")


class SystemSettingsConfig(BaseModel):
    """System settings configuration"""
    # General
    system_name: str = Field(default="NOP - Network Observatory Platform", description="System name")
    timezone: str = Field(default="UTC", description="System timezone")
    language: Literal["en", "es", "fr", "de"] = Field(default="en", description="System language")
    
    # Performance
    enable_caching: bool = Field(default=True, description="Enable caching")
    cache_ttl: int = Field(default=300, ge=60, le=3600, description="Cache TTL in seconds")
    max_workers: int = Field(default=4, ge=1, le=16, description="Maximum worker threads")
    
    # Data retention
    data_retention_days: int = Field(default=30, ge=7, le=365, description="Data retention in days")
    auto_cleanup_enabled: bool = Field(default=True, description="Enable automatic cleanup")
    backup_enabled: bool = Field(default=False, description="Enable automatic backups")
    backup_interval: int = Field(default=24, ge=1, le=168, description="Backup interval in hours")
    
    # Notifications
    enable_notifications: bool = Field(default=True, description="Enable notifications")
    notification_channels: str = Field(default="webhook", description="Notification channels (comma-separated)")
    webhook_url: str = Field(default="", description="Webhook URL for notifications")
    
    # Monitoring
    enable_metrics: bool = Field(default=True, description="Enable metrics collection")
    metrics_interval: int = Field(default=60, ge=10, le=300, description="Metrics collection interval in seconds")
    enable_health_checks: bool = Field(default=True, description="Enable health checks")
    
    # Database
    db_pool_size: int = Field(default=10, ge=5, le=50, description="Database connection pool size")
    db_max_overflow: int = Field(default=20, ge=5, le=100, description="Database max overflow connections")


class SettingsCategory(BaseModel):
    """Settings category wrapper"""
    category: Literal["scan", "discovery", "access", "system"]
    config: dict


class SettingsResponse(BaseModel):
    """Settings response"""
    scan: ScanSettingsConfig
    discovery: DiscoverySettingsConfig
    access: AccessSettingsConfig
    system: SystemSettingsConfig


class SettingsUpdateRequest(BaseModel):
    """Request to update settings"""
    category: Literal["scan", "discovery", "access", "system"]
    config: dict
