"""
Glances API service for fetching CT health metrics
"""

import asyncio
import time
from datetime import datetime
from typing import Optional
import httpx

from app.models.health import CTHealth, CTSHealthResponse, HealthSummary


# CT Configuration
CT_IPS = {i: f"10.10.10.{i}" for i in range(100, 108)}
CT_GLANCES_VER = {i: 4 if i <= 103 else 3 for i in range(100, 108)}

GLANCES_PORT = 61208
TIMEOUT_SECONDS = 3.0
CACHE_TTL_SECONDS = 30

# In-memory cache
_cache: dict = {"ts": 0.0, "data": None}

LOOPBACK_NAMES = {"lo", "lo0", "loopback"}


async def fetch_ct_metrics(ct_id: int, client: httpx.AsyncClient) -> CTHealth:
    """Fetch metrics from a single CT via Glances API"""
    ip = CT_IPS[ct_id]
    version = CT_GLANCES_VER[ct_id]

    try:
        base_url = f"http://{ip}:{GLANCES_PORT}/api/{version}"

        results = await asyncio.gather(
            client.get(f"{base_url}/cpu", timeout=TIMEOUT_SECONDS),
            client.get(f"{base_url}/mem", timeout=TIMEOUT_SECONDS),
            client.get(f"{base_url}/network", timeout=TIMEOUT_SECONDS),
            client.get(f"{base_url}/diskio", timeout=TIMEOUT_SECONDS),
            client.get(f"{base_url}/uptime", timeout=TIMEOUT_SECONDS),
            return_exceptions=True
        )

        cpu_resp, mem_resp, network_resp, disk_resp, uptime_resp = results

        # Initialize metrics
        cpu_percent = cpu_cores = None
        mem_percent = mem_used = mem_total = None
        net_in_sec = net_out_sec = None
        disk_read_sec = disk_write_sec = None
        uptime = None

        # Parse CPU
        if isinstance(cpu_resp, httpx.Response) and cpu_resp.status_code == 200:
            cpu_data = cpu_resp.json()
            cpu_percent = cpu_data.get("total")
            cpu_cores = cpu_data.get("cpucore")

        # Parse Memory
        if isinstance(mem_resp, httpx.Response) and mem_resp.status_code == 200:
            mem_data = mem_resp.json()
            mem_percent = mem_data.get("percent")
            mem_used = mem_data.get("used")
            mem_total = mem_data.get("total")

        # Parse Network
        # v4: bytes_recv_rate_per_sec / bytes_sent_rate_per_sec
        # v3: rx / tx (bytes per update interval)
        if isinstance(network_resp, httpx.Response) and network_resp.status_code == 200:
            network_data = network_resp.json()
            if isinstance(network_data, list):
                ifaces = [i for i in network_data if i.get("interface_name") not in LOOPBACK_NAMES]
                if version == 4:
                    net_in_sec = sum(i.get("bytes_recv_rate_per_sec", 0) or 0 for i in ifaces) or None
                    net_out_sec = sum(i.get("bytes_sent_rate_per_sec", 0) or 0 for i in ifaces) or None
                else:
                    # v3: rx/tx are bytes since last update; divide by time_since_update for rate
                    rx_total = tx_total = 0.0
                    for iface in ifaces:
                        tsu = iface.get("time_since_update") or 1.0
                        rx_total += (iface.get("rx", 0) or 0) / tsu
                        tx_total += (iface.get("tx", 0) or 0) / tsu
                    net_in_sec = rx_total or None
                    net_out_sec = tx_total or None

        # Parse Disk IO
        # v4: read_bytes_rate_per_sec / write_bytes_rate_per_sec
        # v3: read_bytes / write_bytes per update interval
        if isinstance(disk_resp, httpx.Response) and disk_resp.status_code == 200:
            disk_data = disk_resp.json()
            if isinstance(disk_data, list):
                if version == 4:
                    disk_read_sec = sum(d.get("read_bytes_rate_per_sec", 0) or 0 for d in disk_data) or None
                    disk_write_sec = sum(d.get("write_bytes_rate_per_sec", 0) or 0 for d in disk_data) or None
                else:
                    rd_total = wr_total = 0.0
                    for d in disk_data:
                        tsu = d.get("time_since_update") or 1.0
                        rd_total += (d.get("read_bytes", 0) or 0) / tsu
                        wr_total += (d.get("write_bytes", 0) or 0) / tsu
                    disk_read_sec = rd_total or None
                    disk_write_sec = wr_total or None

        # Parse Uptime
        if isinstance(uptime_resp, httpx.Response) and uptime_resp.status_code == 200:
            uptime_data = uptime_resp.json()
            if isinstance(uptime_data, dict):
                uptime = uptime_data.get("seconds")
            elif isinstance(uptime_data, (int, float)):
                uptime = int(uptime_data)
            elif isinstance(uptime_data, str):
                # v3 returns human-readable string like "1 day, 4:31:22"
                uptime = None  # skip parsing string form

        return CTHealth(
            status="online",
            ip=ip,
            cpu_percent=cpu_percent,
            cpu_cores=cpu_cores,
            mem_percent=mem_percent,
            mem_used=mem_used,
            mem_total=mem_total,
            net_in_sec=net_in_sec,
            net_out_sec=net_out_sec,
            disk_read_sec=disk_read_sec,
            disk_write_sec=disk_write_sec,
            uptime=uptime,
            glances_version=version
        )

    except httpx.TimeoutException:
        return CTHealth(
            status="offline",
            ip=ip,
            error=f"Timeout after {TIMEOUT_SECONDS}s"
        )
    except Exception as e:
        return CTHealth(
            status="error",
            ip=ip,
            error=str(e)
        )


async def get_all_cts_health() -> CTSHealthResponse:
    """Fetch health data from all CTs in parallel with 30s cache"""
    global _cache

    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < CACHE_TTL_SECONDS:
        return _cache["data"]

    async with httpx.AsyncClient() as client:
        tasks = [fetch_ct_metrics(ct_id, client) for ct_id in range(100, 108)]
        results = await asyncio.gather(*tasks)

    cts = {f"CT{100 + i}": results[i] for i in range(8)}

    online = sum(1 for ct in results if ct.status == "online")
    offline = sum(1 for ct in results if ct.status == "offline")
    error_count = sum(1 for ct in results if ct.status == "error")

    summary = HealthSummary(total=8, online=online, offline=offline, error_count=error_count)

    response = CTSHealthResponse(
        timestamp=datetime.now(),
        cts=cts,
        summary=summary
    )

    _cache["ts"] = now
    _cache["data"] = response

    return response


async def get_single_ct_health(ct_id: int) -> Optional[CTHealth]:
    """Fetch health data for a single CT (no cache)"""
    if ct_id not in CT_IPS:
        return None
    async with httpx.AsyncClient() as client:
        return await fetch_ct_metrics(ct_id, client)
