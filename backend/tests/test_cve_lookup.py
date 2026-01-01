"""
Unit and integration tests for CVE Lookup Service
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
import httpx

from app.services.cve_lookup import CVELookupService, RateLimitExceeded, ProductQueryInput
from app.models.cve_cache import CVECache
from pydantic import ValidationError


@pytest_asyncio.fixture
async def mock_db():
    """Mock async database session"""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = Mock()
    db.rollback = AsyncMock()
    return db


@pytest.fixture
def cve_service(mock_db):
    """Create CVE lookup service instance"""
    return CVELookupService(mock_db)


@pytest.fixture
def sample_nvd_response():
    """Sample NVD API response"""
    return {
        "vulnerabilities": [{
            "cve": {
                "id": "CVE-2023-1234",
                "descriptions": [
                    {"lang": "en", "value": "Test vulnerability description. This is a critical RCE."}
                ],
                "metrics": {
                    "cvssMetricV31": [{
                        "cvssData": {
                            "baseScore": 9.8,
                            "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                            "baseSeverity": "CRITICAL"
                        }
                    }]
                },
                "configurations": [{
                    "nodes": [{
                        "cpeMatch": [{
                            "criteria": "cpe:2.3:a:vendor:product:1.0:*:*:*:*:*:*:*"
                        }]
                    }]
                }],
                "references": [
                    {"url": "https://example.com/advisory"}
                ]
            }
        }]
    }


class TestInputSanitization:
    """Test input validation and sanitization"""
    
    def test_valid_inputs(self):
        """Test valid inputs pass validation"""
        validated = ProductQueryInput(
            vendor="apache",
            product="struts",
            version="2.5.10"
        )
        assert validated.vendor == "apache"
        assert validated.product == "struts"
        assert validated.version == "2.5.10"
    
    def test_sql_injection_blocked(self):
        """Test SQL injection patterns are blocked"""
        with pytest.raises(ValidationError):
            ProductQueryInput(
                vendor="apache' OR 1=1--",
                product="struts",
                version="2.5.10"
            )
    
    def test_command_injection_blocked(self):
        """Test command injection patterns are blocked"""
        with pytest.raises(ValidationError):
            ProductQueryInput(
                vendor="apache",
                product="struts; rm -rf /",
                version="2.5.10"
            )
    
    def test_path_traversal_blocked(self):
        """Test path traversal is blocked"""
        with pytest.raises(ValidationError):
            ProductQueryInput(
                vendor="../etc/passwd",
                product="struts",
                version="2.5.10"
            )
    
    def test_shell_metacharacters_blocked(self):
        """Test shell metacharacters are blocked"""
        dangerous_chars = ['|', '&', '$', '`', '\n', '\r']
        for char in dangerous_chars:
            with pytest.raises(ValidationError):
                ProductQueryInput(
                    vendor=f"apache{char}whoami",
                    product="struts",
                    version="2.5.10"
                )
    
    def test_sanitized_output(self):
        """Test that special characters are removed"""
        validated = ProductQueryInput(
            vendor="apache",
            product="struts-2",
            version="2.5_beta.1"
        )
        # Should allow alphanumeric, dots, hyphens, underscores
        assert "struts-2" in validated.product or "struts2" in validated.product
        assert "2.5" in validated.version


class TestCacheLogic:
    """Test cache hit/miss and expiration"""
    
    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached_data(self, cve_service, mock_db):
        """Test cache hit returns cached entry"""
        # Setup cached entry (not expired)
        cached = CVECache(
            cve_id="CVE-2023-1234",
            title="Test CVE",
            description="Test description",
            cvss_score=9.8,
            severity="CRITICAL",
            expires_at=datetime.utcnow() + timedelta(days=1),
            fetched_at=datetime.utcnow()
        )
        
        result = Mock()
        result.scalar_one_or_none.return_value = cached
        mock_db.execute.return_value = result
        
        # Execute
        data = await cve_service.lookup_by_cve("CVE-2023-1234")
        
        # Verify
        assert data is not None
        assert data["cve_id"] == "CVE-2023-1234"
        assert data["cvss_score"] == 9.8
    
    @pytest.mark.asyncio
    async def test_cache_miss_fetches_from_api(self, cve_service, mock_db, sample_nvd_response):
        """Test cache miss triggers API fetch"""
        # Setup: no cache entry
        result = Mock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result
        
        # Mock HTTP request
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = sample_nvd_response
            
            mock_get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.get = mock_get
            
            # Execute
            data = await cve_service.lookup_by_cve("CVE-2023-1234")
            
            # Verify API was called
            assert mock_get.called
            assert data is not None
            assert data["cve_id"] == "CVE-2023-1234"
    
    @pytest.mark.asyncio
    async def test_expired_cache_refetches(self, cve_service, mock_db, sample_nvd_response):
        """Test expired cache triggers refetch"""
        # Setup expired cache entry
        cached = CVECache(
            cve_id="CVE-2023-1234",
            title="Old data",
            description="Outdated",
            cvss_score=5.0,
            expires_at=datetime.utcnow() - timedelta(days=1),  # Expired
            fetched_at=datetime.utcnow() - timedelta(days=8)
        )
        
        result = Mock()
        result.scalar_one_or_none.return_value = cached
        mock_db.execute.return_value = result
        
        # Mock HTTP request
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = sample_nvd_response
            
            mock_get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.get = mock_get
            
            # Execute
            data = await cve_service.lookup_by_cve("CVE-2023-1234")
            
            # Verify fresh data was fetched
            assert mock_get.called
            assert data is not None


class TestRateLimiting:
    """Test rate limit enforcement"""
    
    @pytest.mark.asyncio
    async def test_rate_limit_enforces_5_per_30s(self, cve_service, mock_db):
        """Test rate limiter blocks after 5 requests in 30 seconds"""
        import time
        
        # Simulate 5 requests
        for i in range(5):
            cve_service._request_timestamps.append(time.time())
        
        # 6th request should wait
        start = time.time()
        
        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            await cve_service._check_rate_limit()
            
            # Should have called sleep
            assert mock_sleep.called
            assert mock_sleep.call_args[0][0] > 0  # Wait time > 0
    
    @pytest.mark.asyncio
    async def test_rate_limit_allows_after_window(self, cve_service):
        """Test rate limiter allows requests after window expires"""
        import time
        
        # Simulate old requests (> 30s ago)
        old_time = time.time() - 35
        cve_service._request_timestamps = [old_time] * 5
        
        # Should not wait (old timestamps removed)
        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            await cve_service._check_rate_limit()
            
            # Should not sleep
            assert not mock_sleep.called
    
    @pytest.mark.asyncio
    async def test_rate_limit_uses_wall_clock_time(self, cve_service):
        """Test rate limiter uses time.time() not asyncio loop time"""
        import time
        
        # Record timestamp
        await cve_service._check_rate_limit()
        
        # Verify timestamp is from time.time() (absolute)
        assert len(cve_service._request_timestamps) == 1
        assert abs(cve_service._request_timestamps[0] - time.time()) < 1.0


class TestAPIKeyUsage:
    """Test NVD API key is properly used"""
    
    @pytest.mark.asyncio
    async def test_api_key_added_to_headers(self, cve_service, mock_db, sample_nvd_response):
        """Test API key is added to request headers"""
        cve_service.api_key = "test-api-key-12345"
        
        result = Mock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = sample_nvd_response
            
            mock_get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.get = mock_get
            
            await cve_service.lookup_by_cve("CVE-2023-1234")
            
            # Verify headers included API key
            call_kwargs = mock_get.call_args[1]
            assert 'headers' in call_kwargs
            assert call_kwargs['headers']['apiKey'] == "test-api-key-12345"
    
    @pytest.mark.asyncio
    async def test_no_api_key_header_when_missing(self, cve_service, mock_db, sample_nvd_response):
        """Test no apiKey header when API key not set"""
        cve_service.api_key = None
        
        result = Mock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = sample_nvd_response
            
            mock_get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.get = mock_get
            
            await cve_service.lookup_by_cve("CVE-2023-1234")
            
            # Verify no apiKey in headers
            call_kwargs = mock_get.call_args[1]
            assert 'headers' in call_kwargs
            assert 'apiKey' not in call_kwargs['headers'] or call_kwargs['headers'] == {}


class TestLogMasking:
    """Test sensitive data masking in logs"""
    
    def test_api_key_masked_in_errors(self, cve_service):
        """Test API key is masked in log messages"""
        cve_service.api_key = "secret-key-12345"
        
        error_message = "Error fetching https://api.nvd.nist.gov?apiKey=secret-key-12345"
        masked = cve_service._mask_sensitive_data(error_message)
        
        assert "secret-key-12345" not in masked
        assert "***REDACTED***" in masked
    
    def test_no_masking_when_no_key(self, cve_service):
        """Test no masking when API key not set"""
        cve_service.api_key = None
        
        message = "Error fetching API"
        masked = cve_service._mask_sensitive_data(message)
        
        assert masked == message


class TestProductVersionLookup:
    """Test lookup by product and version"""
    
    @pytest.mark.asyncio
    async def test_lookup_validates_inputs(self, cve_service, mock_db):
        """Test lookup validates and sanitizes inputs"""
        with patch.object(cve_service, '_fetch_by_cpe', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = []
            
            # Valid inputs should work
            await cve_service.lookup_by_product_version(
                product="openssh",
                version="7.4",
                vendor="openbsd"
            )
            
            assert mock_fetch.called
    
    @pytest.mark.asyncio
    async def test_lookup_rejects_malicious_inputs(self, cve_service, mock_db):
        """Test lookup rejects malicious inputs"""
        result = await cve_service.lookup_by_product_version(
            product="openssh; rm -rf /",
            version="7.4",
            vendor="openbsd"
        )
        
        # Should return empty list on validation failure
        assert result == []


class TestNVDAPIIntegration:
    """Integration tests for NVD API (mocked)"""
    
    @pytest.mark.asyncio
    async def test_429_rate_limit_response_raises_exception(self, cve_service, mock_db):
        """Test 429 status code raises RateLimitExceeded"""
        result = Mock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 429
            
            mock_get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.get = mock_get
            
            with pytest.raises(RateLimitExceeded):
                await cve_service.lookup_by_cve("CVE-2023-1234")
    
    @pytest.mark.asyncio
    async def test_timeout_returns_none(self, cve_service, mock_db):
        """Test timeout returns None gracefully"""
        result = Mock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_get = AsyncMock(side_effect=httpx.TimeoutException("Timeout"))
            mock_client.return_value.__aenter__.return_value.get = mock_get
            
            data = await cve_service.lookup_by_cve("CVE-2023-1234")
            
            assert data is None
    
    @pytest.mark.asyncio
    async def test_404_returns_none(self, cve_service, mock_db):
        """Test 404 not found returns None"""
        result = Mock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.text = "Not found"
            
            mock_get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.get = mock_get
            
            data = await cve_service.lookup_by_cve("CVE-9999-FAKE")
            
            assert data is None
