"""
Configuration constants for network services
"""

# Packet crafting constants
PACKET_SEND_TIMEOUT = 3  # seconds
RESPONSE_HEX_MAX_LENGTH = 200  # characters
STORM_THREAD_STOP_TIMEOUT = 2.0  # seconds

# Packet capture constants
MAX_STORED_PACKETS = 1000
STATS_UPDATE_INTERVAL = 1  # seconds
TRAFFIC_HISTORY_LENGTH = 20  # data points
INTERFACE_HISTORY_LENGTH = 30  # data points

# Storm testing limits
MIN_PPS = 1
MAX_PPS = 10_000_000
VALID_PACKET_TYPES = ["broadcast", "multicast", "tcp", "udp", "raw_ip"]

# Network filtering defaults
DEFAULT_TRACK_SOURCE_ONLY = True
DEFAULT_FILTER_UNICAST = False
DEFAULT_FILTER_MULTICAST = True
DEFAULT_FILTER_BROADCAST = True

# Ping service constants
MIN_PING_COUNT = 1
MAX_PING_COUNT = 100
MIN_TIMEOUT = 1
MAX_TIMEOUT = 30
MIN_PACKET_SIZE = 1
MAX_PACKET_SIZE = 65500

# Port ranges
MIN_PORT = 1
MAX_PORT = 65535

# Protocol defaults
DEFAULT_SSH_PORT = 22
DEFAULT_FTP_PORT = 21
DEFAULT_HTTP_PORT = 80
DEFAULT_HTTPS_PORT = 443
DEFAULT_RDP_PORT = 3389
DEFAULT_VNC_PORT = 5900
DEFAULT_TELNET_PORT = 23
DEFAULT_MYSQL_PORT = 3306
DEFAULT_POSTGRES_PORT = 5432

# Service detection timeouts
CONNECTION_TIMEOUT = 5  # seconds
HTTP_REQUEST_TIMEOUT = 10  # seconds
