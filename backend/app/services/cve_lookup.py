"""
CVE Lookup Service for NVD API integration
"""

import asyncio
import httpx
import logging
import os
import re
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, field_validator, ValidationError

from app.models.cve_cache import CVECache

logger = logging.getLogger(__name__)


class ProductQueryInput(BaseModel):
    """Pydantic model for input validation and sanitization"""
    vendor: Optional[str] = None
    product: str
    version: str
    
    @field_validator('vendor', 'product', 'version')
    @classmethod
    def sanitize_input(cls, v: Optional[str]) -> Optional[str]:
        """
        Sanitize inputs to prevent injection attacks.
        Allow only: alphanumeric, dots, hyphens, underscores, spaces
        Block: SQL injection chars, shell metacharacters, path traversal
        """
        if v is None:
            return v
        
        # Remove dangerous characters
        sanitized = re.sub(r'[^a-zA-Z0-9._\-\s]', '', v)
        
        # Block path traversal
        if '..' in sanitized:
            raise ValueError(f"Invalid input: path traversal detected")
        
        # Block common injection patterns
        dangerous_patterns = ['--', ';', '|', '&', '$', '`', '\n', '\r']
        for pattern in dangerous_patterns:
            if pattern in v:
                raise ValueError(f"Invalid input: dangerous pattern '{pattern}' detected")
        
        return sanitized.strip()


class RateLimitExceeded(Exception):
    """Raised when NVD API rate limit is exceeded"""
    pass


class CVELookupService:
    """Service for querying NVD API and caching results"""
    
    NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    RATE_LIMIT_REQUESTS = 5
    RATE_LIMIT_WINDOW = 30  # seconds
    CACHE_TTL_DAYS = 7
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self._request_timestamps: List[float] = []
        self.api_key = os.getenv('NVD_API_KEY')
    
    def _mask_sensitive_data(self, text: str) -> str:
        """Mask API key from log messages"""
        if self.api_key and self.api_key in text:
            return text.replace(self.api_key, '***REDACTED***')
        return text
    
    async def lookup_by_cve(self, cve_id: str) -> Optional[Dict[str, Any]]:
        """
        Lookup CVE by ID, checking cache first
        
        Args:
            cve_id: CVE identifier (e.g., CVE-2023-1234)
            
        Returns:
            CVE data dict or None if not found
        """
        try:
            # Check cache first
            cached = await self._get_from_cache(cve_id)
            if cached and not cached.is_expired():
                logger.info(f"Cache hit for {cve_id}")
                return self._cache_to_dict(cached)
            
            # Fetch from NVD API
            logger.info(f"Cache miss for {cve_id}, fetching from NVD API")
            data = await self._fetch_from_nvd(cve_id)
            
            if data:
                # Cache the result
                await self._save_to_cache(cve_id, data)
                return data
            
            return None
            
        except RateLimitExceeded:
            logger.warning(f"Rate limit exceeded for {cve_id}")
            # Return cached data even if expired
            if cached:
                logger.info(f"Returning expired cache for {cve_id} due to rate limit")
                return self._cache_to_dict(cached)
            raise
        except Exception as e:
            logger.error(f"Error looking up CVE {cve_id}: {str(e)}")
            return None
    
    async def lookup_by_product_version(
        self, 
        product: str, 
        version: str,
        vendor: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lookup CVEs by product and version
        
        Args:
            product: Product name (e.g., "openssh")
            version: Version string (e.g., "7.4")
            vendor: Optional vendor name (e.g., "openbsd")
            
        Returns:
            List of CVE data dicts
        """
        try:
            # Validate and sanitize inputs
            try:
                validated = ProductQueryInput(
                    vendor=vendor,
                    product=product,
                    version=version
                )
                vendor = validated.vendor
                product = validated.product
                version = validated.version
            except ValidationError as e:
                logger.error(f"Input validation failed: {e}")
                return []
            
            # Build CPE URI for query
            cpe_uri = self._build_cpe_uri(vendor, product, version)
            
            logger.info(f"Querying NVD for CPE: {cpe_uri}")
            
            # Query NVD API
            data = await self._fetch_by_cpe(cpe_uri)
            return data
            
        except Exception as e:
            logger.error(f"Error looking up product {product} {version}: {str(e)}")
            return []
    
    async def _get_from_cache(self, cve_id: str) -> Optional[CVECache]:
        """Retrieve CVE from cache"""
        result = await self.db.execute(
            select(CVECache).where(CVECache.cve_id == cve_id)
        )
        return result.scalar_one_or_none()
    
    async def _save_to_cache(self, cve_id: str, data: Dict[str, Any]) -> CVECache:
        """Save CVE data to cache"""
        expires_at = datetime.utcnow() + timedelta(days=self.CACHE_TTL_DAYS)
        
        # Check if exists
        existing = await self._get_from_cache(cve_id)
        
        if existing:
            # Update existing
            existing.title = data.get("title")
            existing.description = data.get("description")
            existing.cvss_score = data.get("cvss_score")
            existing.cvss_vector = data.get("cvss_vector")
            existing.severity = data.get("severity")
            existing.cpe_list = data.get("cpe_list", [])
            existing.affected_products = data.get("affected_products", [])
            existing.references = data.get("references", [])
            existing.fetched_at = datetime.utcnow()
            existing.expires_at = expires_at
            cache_entry = existing
        else:
            # Create new
            cache_entry = CVECache(
                cve_id=cve_id,
                title=data.get("title"),
                description=data.get("description"),
                cvss_score=data.get("cvss_score"),
                cvss_vector=data.get("cvss_vector"),
                severity=data.get("severity"),
                cpe_list=data.get("cpe_list", []),
                affected_products=data.get("affected_products", []),
                references=data.get("references", []),
                expires_at=expires_at
            )
            self.db.add(cache_entry)
        
        await self.db.commit()
        await self.db.refresh(cache_entry)
        
        return cache_entry
    
    async def _fetch_from_nvd(self, cve_id: str) -> Optional[Dict[str, Any]]:
        """Fetch CVE data from NVD API"""
        await self._check_rate_limit()
        
        try:
            headers = {}
            if self.api_key:
                headers['apiKey'] = self.api_key
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    self.NVD_API_URL,
                    params={"cveId": cve_id},
                    headers=headers
                )
                
                if response.status_code == 200:
                    json_data = response.json()
                    return self._parse_nvd_response(json_data)
                elif response.status_code == 429:
                    raise RateLimitExceeded("NVD API rate limit exceeded")
                else:
                    masked_text = self._mask_sensitive_data(response.text)
                    logger.error(f"NVD API error {response.status_code}: {masked_text}")
                    return None
                    
        except RateLimitExceeded:
            # Re-raise rate limit exceptions so callers can handle them
            raise
        except httpx.TimeoutException:
            logger.error(f"Timeout fetching {cve_id} from NVD API")
            return None
        except Exception as e:
            masked_error = self._mask_sensitive_data(str(e))
            logger.error(f"Error fetching {cve_id} from NVD API: {masked_error}")
            return None
    
    async def _fetch_by_cpe(self, cpe_uri: str) -> List[Dict[str, Any]]:
        """Fetch CVEs by CPE URI"""
        await self._check_rate_limit()
        
        try:
            headers = {}
            if self.api_key:
                headers['apiKey'] = self.api_key
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    self.NVD_API_URL,
                    params={"cpeName": cpe_uri},
                    headers=headers
                )
                
                if response.status_code == 200:
                    json_data = response.json()
                    return self._parse_nvd_cpe_response(json_data)
                elif response.status_code == 429:
                    raise RateLimitExceeded("NVD API rate limit exceeded")
                else:
                    masked_text = self._mask_sensitive_data(response.text)
                    logger.error(f"NVD API error {response.status_code}: {masked_text}")
                    return []
                    
        except RateLimitExceeded:
            # Re-raise rate limit exceptions so callers can handle them
            raise
        except Exception as e:
            masked_error = self._mask_sensitive_data(str(e))
            logger.error(f"Error fetching CPE {cpe_uri} from NVD API: {masked_error}")
            return []
    
    async def _check_rate_limit(self):
        """Check and enforce rate limiting"""
        now = time.time()  # Use wall clock time for persistence across requests
        
        # Remove timestamps older than window
        cutoff = now - self.RATE_LIMIT_WINDOW
        self._request_timestamps = [
            ts for ts in self._request_timestamps 
            if ts > cutoff
        ]
        
        # Check if limit exceeded
        if len(self._request_timestamps) >= self.RATE_LIMIT_REQUESTS:
            # Calculate wait time
            oldest = min(self._request_timestamps)
            wait_time = self.RATE_LIMIT_WINDOW - (now - oldest)
            
            if wait_time > 0:
                logger.warning(f"Rate limit reached, waiting {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
        
        # Record this request
        self._request_timestamps.append(now)
    
    def _parse_nvd_response(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse NVD API response"""
        try:
            vulnerabilities = data.get("vulnerabilities", [])
            if not vulnerabilities:
                return None
            
            cve_item = vulnerabilities[0]["cve"]
            
            # Extract CVSS data
            cvss_data = self._extract_cvss(cve_item)
            
            # Extract CPE data
            cpe_list, affected_products = self._extract_cpe_data(cve_item)
            
            # Extract references
            references = [
                ref.get("url") 
                for ref in cve_item.get("references", [])
            ]
            
            return {
                "cve_id": cve_item.get("id"),
                "title": self._extract_title(cve_item),
                "description": self._extract_description(cve_item),
                "cvss_score": cvss_data.get("score"),
                "cvss_vector": cvss_data.get("vector"),
                "severity": cvss_data.get("severity"),
                "cpe_list": cpe_list,
                "affected_products": affected_products,
                "references": references
            }
            
        except Exception as e:
            logger.error(f"Error parsing NVD response: {str(e)}")
            return None
    
    def _parse_nvd_cpe_response(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse NVD CPE query response"""
        results = []
        
        try:
            for vuln_item in data.get("vulnerabilities", []):
                parsed = self._parse_nvd_response({"vulnerabilities": [vuln_item]})
                if parsed:
                    results.append(parsed)
        except Exception as e:
            logger.error(f"Error parsing NVD CPE response: {str(e)}")
        
        return results
    
    def _extract_cvss(self, cve_item: Dict[str, Any]) -> Dict[str, Any]:
        """Extract CVSS scoring data"""
        metrics = cve_item.get("metrics", {})
        
        # Try CVSS v3.1 first, then v3.0, then v2.0
        for version in ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]:
            if version in metrics and metrics[version]:
                cvss = metrics[version][0]["cvssData"]
                return {
                    "score": cvss.get("baseScore"),
                    "vector": cvss.get("vectorString"),
                    "severity": cvss.get("baseSeverity", "UNKNOWN").upper()
                }
        
        return {"score": None, "vector": None, "severity": "UNKNOWN"}
    
    def _extract_cpe_data(self, cve_item: Dict[str, Any]) -> tuple:
        """Extract CPE URIs and affected products"""
        cpe_list = []
        affected_products = []
        
        try:
            configurations = cve_item.get("configurations", [])
            for config in configurations:
                for node in config.get("nodes", []):
                    for match in node.get("cpeMatch", []):
                        cpe_uri = match.get("criteria")
                        if cpe_uri:
                            cpe_list.append(cpe_uri)
                            
                            # Parse product info
                            product_info = self._parse_cpe_uri(cpe_uri)
                            if product_info:
                                affected_products.append(product_info)
        except Exception as e:
            logger.error(f"Error extracting CPE data: {str(e)}")
        
        return cpe_list, affected_products
    
    def _extract_title(self, cve_item: Dict[str, Any]) -> str:
        """Extract CVE title from descriptions"""
        descriptions = cve_item.get("descriptions", [])
        for desc in descriptions:
            if desc.get("lang") == "en":
                text = desc.get("value", "")
                # Use first sentence as title
                if ". " in text:
                    return text.split(". ")[0]
                return text[:100]
        return "Unknown Vulnerability"
    
    def _extract_description(self, cve_item: Dict[str, Any]) -> str:
        """Extract CVE description"""
        descriptions = cve_item.get("descriptions", [])
        for desc in descriptions:
            if desc.get("lang") == "en":
                return desc.get("value", "")
        return ""
    
    def _parse_cpe_uri(self, cpe_uri: str) -> Optional[Dict[str, str]]:
        """Parse CPE URI into components"""
        try:
            # CPE format: cpe:2.3:part:vendor:product:version:update:edition:language:sw_edition:target_sw:target_hw:other
            parts = cpe_uri.split(":")
            if len(parts) >= 6:
                return {
                    "vendor": parts[3],
                    "product": parts[4],
                    "version": parts[5]
                }
        except Exception:
            pass
        return None
    
    def _build_cpe_uri(self, vendor: Optional[str], product: str, version: str) -> str:
        """
        Build CPE URI for querying
        Maps common nmap product names to NVD CPE names
        """
        # Product name mapping: nmap -> (vendor, cpe_product)
        product_map = {
            "apache httpd": ("apache", "http_server"),
            "apache": ("apache", "http_server"),
            "nginx": ("nginx", "nginx"),
            "openssh": ("openbsd", "openssh"),
            "mysql": ("mysql", "mysql"),
            "mariadb": ("mariadb", "mariadb"),
            "postgresql": ("postgresql", "postgresql"),
            "vsftpd": ("vsftpd_project", "vsftpd"),
            "proftpd": ("proftpd", "proftpd"),
        }
        
        # Check if product needs mapping
        product_lower = product.lower()
        if product_lower in product_map:
            mapped_vendor, mapped_product = product_map[product_lower]
            # Use mapped vendor if not provided
            if not vendor:
                vendor = mapped_vendor
            product = mapped_product
        
        vendor_part = vendor or "*"
        return f"cpe:2.3:a:{vendor_part}:{product}:{version}:*:*:*:*:*:*:*"
    
    def _cache_to_dict(self, cache: CVECache) -> Dict[str, Any]:
        """Convert cache entry to dict"""
        return {
            "cve_id": cache.cve_id,
            "title": cache.title,
            "description": cache.description,
            "cvss_score": cache.cvss_score,
            "cvss_vector": cache.cvss_vector,
            "severity": cache.severity,
            "cpe_list": cache.cpe_list or [],
            "affected_products": cache.affected_products or [],
            "references": cache.references or [],
            "cached_at": cache.fetched_at.isoformat() if cache.fetched_at else None
        }
