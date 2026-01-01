"""
Unit and integration tests for Version Detection Service
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch
from pydantic import ValidationError

from app.services.version_detection import VersionDetectionService, ServiceInfo


@pytest_asyncio.fixture
async def mock_db():
    """Mock async database session"""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.rollback = AsyncMock()
    return db


@pytest.fixture
def version_service(mock_db):
    """Create version detection service instance"""
    return VersionDetectionService(mock_db)


@pytest.fixture
def sample_nmap_xml():
    """Sample nmap -sV XML output"""
    return """
    <nmaprun>
        <host>
            <address addr="192.168.1.10"/>
            <ports>
                <port portid="22" protocol="tcp">
                    <state state="open"/>
                    <service name="ssh" product="OpenSSH" version="7.4" extrainfo="protocol 2.0">
                        <cpe>cpe:/a:openbsd:openssh:7.4</cpe>
                    </service>
                </port>
                <port portid="80" protocol="tcp">
                    <state state="open"/>
                    <service name="http" product="Apache httpd" version="2.4.29" ostype="Ubuntu">
                        <cpe>cpe:/a:apache:http_server:2.4.29</cpe>
                    </service>
                </port>
                <port portid="3306" protocol="tcp">
                    <state state="open"/>
                    <service name="mysql" product="MySQL" version="5.7.30"/>
                </port>
            </ports>
        </host>
    </nmaprun>
    """


class TestServiceInfoValidation:
    """Test Pydantic validation for service data"""
    
    def test_valid_service_data(self):
        """Test valid service data passes validation"""
        service = ServiceInfo(
            port=22,
            protocol="tcp",
            service="ssh",
            product="OpenSSH",
            version="7.4",
            cpe=["cpe:/a:openbsd:openssh:7.4"]
        )
        
        assert service.port == 22
        assert service.protocol == "tcp"
        assert service.service == "ssh"
    
    def test_port_validation_rejects_invalid(self):
        """Test port validation rejects out of range ports"""
        # Port too low
        with pytest.raises(ValidationError):
            ServiceInfo(
                port=0,
                protocol="tcp",
                service="test"
            )
        
        # Port too high
        with pytest.raises(ValidationError):
            ServiceInfo(
                port=70000,
                protocol="tcp",
                service="test"
            )
    
    def test_port_validation_accepts_valid_range(self):
        """Test port validation accepts 1-65535"""
        # Minimum port
        service1 = ServiceInfo(port=1, protocol="tcp", service="test")
        assert service1.port == 1
        
        # Maximum port
        service2 = ServiceInfo(port=65535, protocol="tcp", service="test")
        assert service2.port == 65535
    
    def test_protocol_validation(self):
        """Test protocol validation"""
        # Valid protocols
        for proto in ["tcp", "udp", "sctp"]:
            service = ServiceInfo(port=80, protocol=proto, service="test")
            assert service.protocol == proto
        
        # Invalid protocol
        with pytest.raises(ValidationError):
            ServiceInfo(port=80, protocol="invalid", service="test")


class TestIPValidation:
    """Test IP address validation"""
    
    @pytest.mark.asyncio
    async def test_valid_ipv4_accepted(self, version_service):
        """Test valid IPv4 addresses are accepted"""
        valid_ips = ["192.168.1.1", "10.0.0.1", "172.16.0.1", "8.8.8.8"]
        
        for ip in valid_ips:
            with patch('asyncio.wait_for', new_callable=AsyncMock) as mock_wait:
                mock_proc = Mock()
                mock_proc.returncode = 0
                mock_proc.communicate = AsyncMock(return_value=(b"<nmaprun></nmaprun>", b""))
                
                mock_wait.side_effect = [mock_proc, (b"<nmaprun></nmaprun>", b"")]
                
                result = await version_service.detect_versions(ip)
                
                # Should not return error
                assert "error" not in result or "Invalid IP" not in result.get("error", "")
    
    @pytest.mark.asyncio
    async def test_invalid_ip_rejected(self, version_service):
        """Test invalid IP addresses are rejected"""
        invalid_ips = [
            "999.999.999.999",
            "192.168.1",
            "192.168.1.1.1",
            "hostname.com",
            "192.168.1.1; rm -rf /",
            "$(whoami)"
        ]
        
        for ip in invalid_ips:
            result = await version_service.detect_versions(ip)
            
            # Should return error
            assert "error" in result
            assert "Invalid IP" in result["error"]
    
    @pytest.mark.asyncio
    async def test_valid_ipv6_accepted(self, version_service):
        """Test valid IPv6 addresses are accepted"""
        valid_ipv6 = ["::1", "fe80::1", "2001:db8::1"]
        
        for ip in valid_ipv6:
            with patch('asyncio.wait_for', new_callable=AsyncMock) as mock_wait:
                mock_proc = Mock()
                mock_proc.returncode = 0
                mock_proc.communicate = AsyncMock(return_value=(b"<nmaprun></nmaprun>", b""))
                
                mock_wait.side_effect = [mock_proc, (b"<nmaprun></nmaprun>", b"")]
                
                result = await version_service.detect_versions(ip)
                
                assert "error" not in result or "Invalid IP" not in result.get("error", "")


class TestPortValidation:
    """Test port number validation"""
    
    @pytest.mark.asyncio
    async def test_valid_ports_accepted(self, version_service):
        """Test valid port numbers are accepted"""
        with patch('asyncio.wait_for', new_callable=AsyncMock) as mock_wait:
            mock_proc = Mock()
            mock_proc.returncode = 0
            mock_proc.communicate = AsyncMock(return_value=(b"<nmaprun></nmaprun>", b""))
            
            mock_wait.side_effect = [mock_proc, (b"<nmaprun></nmaprun>", b"")]
            
            result = await version_service.detect_versions(
                "192.168.1.1",
                ports=[22, 80, 443, 3306, 8080]
            )
            
            assert "error" not in result or "Invalid port" not in result.get("error", "")
    
    @pytest.mark.asyncio
    async def test_invalid_ports_rejected(self, version_service):
        """Test invalid port numbers are rejected"""
        # Port 0
        result1 = await version_service.detect_versions("192.168.1.1", ports=[0])
        assert "error" in result1
        assert "Invalid port" in result1["error"]
        
        # Port > 65535
        result2 = await version_service.detect_versions("192.168.1.1", ports=[70000])
        assert "error" in result2
        assert "Invalid port" in result2["error"]
        
        # Negative port
        result3 = await version_service.detect_versions("192.168.1.1", ports=[-1])
        assert "error" in result3
        assert "Invalid port" in result3["error"]
    
    @pytest.mark.asyncio
    async def test_non_integer_ports_rejected(self, version_service):
        """Test non-integer ports are rejected"""
        result = await version_service.detect_versions(
            "192.168.1.1",
            ports=["22; rm -rf /"]
        )
        
        assert "error" in result


class TestCommandInjectionPrevention:
    """Test command injection prevention"""
    
    @pytest.mark.asyncio
    async def test_subprocess_uses_explicit_args(self, version_service):
        """Test subprocess uses explicit argument list (shell=False)"""
        with patch('asyncio.wait_for', new_callable=AsyncMock) as mock_wait:
            mock_proc = Mock()
            mock_proc.returncode = 0
            mock_proc.communicate = AsyncMock(return_value=(b"<nmaprun></nmaprun>", b""))
            
            mock_create = AsyncMock(return_value=mock_proc)
            mock_wait.side_effect = [mock_proc, (b"<nmaprun></nmaprun>", b"")]
            
            with patch('asyncio.create_subprocess_exec', mock_create):
                await version_service.detect_versions("192.168.1.1")
                
                # Verify create_subprocess_exec was called with explicit args
                assert mock_create.called
                call_args = mock_create.call_args[0]
                
                # Should be separate arguments, not a single string
                assert "nmap" in call_args
                assert "-sV" in call_args
                assert "-Pn" in call_args
    
    @pytest.mark.asyncio
    async def test_timeout_enforced(self, version_service):
        """Test subprocess execution has timeout"""
        with patch('asyncio.wait_for', new_callable=AsyncMock) as mock_wait:
            mock_proc = Mock()
            mock_proc.returncode = 0
            mock_proc.communicate = AsyncMock(return_value=(b"<nmaprun></nmaprun>", b""))
            
            mock_wait.side_effect = [mock_proc, (b"<nmaprun></nmaprun>", b"")]
            
            await version_service.detect_versions("192.168.1.1")
            
            # Verify wait_for was called with timeout
            assert mock_wait.called
            # Should have timeout kwarg
            assert any('timeout' in str(call) for call in mock_wait.call_args_list)


class TestXMLParsing:
    """Test nmap XML parsing"""
    
    def test_extract_services_from_xml(self, version_service, sample_nmap_xml):
        """Test service extraction from nmap XML"""
        services = version_service._extract_services_from_xml(sample_nmap_xml)
        
        assert len(services) == 3
        
        # Check SSH service
        ssh = next(s for s in services if s["port"] == 22)
        assert ssh["service"] == "ssh"
        assert ssh["product"] == "OpenSSH"
        assert ssh["version"] == "7.4"
        assert "cpe:/a:openbsd:openssh:7.4" in ssh["cpe"]
        
        # Check HTTP service
        http = next(s for s in services if s["port"] == 80)
        assert http["service"] == "http"
        assert http["product"] == "Apache httpd"
        assert http["version"] == "2.4.29"
        assert http["ostype"] == "Ubuntu"
        
        # Check MySQL service
        mysql = next(s for s in services if s["port"] == 3306)
        assert mysql["service"] == "mysql"
        assert mysql["product"] == "MySQL"
        assert mysql["version"] == "5.7.30"
    
    def test_xml_parsing_validates_services(self, version_service):
        """Test XML parsing validates service data with Pydantic"""
        # XML with invalid port
        invalid_xml = """
        <nmaprun>
            <host>
                <ports>
                    <port portid="99999" protocol="tcp">
                        <state state="open"/>
                        <service name="test" product="Test" version="1.0"/>
                    </port>
                </ports>
            </host>
        </nmaprun>
        """
        
        services = version_service._extract_services_from_xml(invalid_xml)
        
        # Should skip invalid service
        assert len(services) == 0
    
    def test_xml_parsing_handles_missing_fields(self, version_service):
        """Test XML parsing handles missing optional fields"""
        minimal_xml = """
        <nmaprun>
            <host>
                <ports>
                    <port portid="22" protocol="tcp">
                        <state state="open"/>
                        <service name="ssh"/>
                    </port>
                </ports>
            </host>
        </nmaprun>
        """
        
        services = version_service._extract_services_from_xml(minimal_xml)
        
        assert len(services) == 1
        assert services[0]["port"] == 22
        assert services[0]["service"] == "ssh"
        assert services[0]["product"] == ""
        assert services[0]["version"] == ""
    
    def test_xml_parsing_skips_closed_ports(self, version_service):
        """Test XML parsing skips non-open ports"""
        closed_port_xml = """
        <nmaprun>
            <host>
                <ports>
                    <port portid="22" protocol="tcp">
                        <state state="closed"/>
                        <service name="ssh"/>
                    </port>
                    <port portid="80" protocol="tcp">
                        <state state="open"/>
                        <service name="http"/>
                    </port>
                </ports>
            </host>
        </nmaprun>
        """
        
        services = version_service._extract_services_from_xml(closed_port_xml)
        
        # Should only include open port
        assert len(services) == 1
        assert services[0]["port"] == 80


class TestAssetUpdate:
    """Test asset database update"""
    
    @pytest.mark.asyncio
    async def test_asset_services_updated(self, version_service, mock_db):
        """Test asset services field is updated"""
        # Mock asset lookup
        mock_asset = Mock()
        mock_asset.ip_address = "192.168.1.10"
        mock_asset.services = None
        
        result = Mock()
        result.scalar_one_or_none.return_value = mock_asset
        mock_db.execute.return_value = result
        
        services = [
            {"port": 22, "protocol": "tcp", "service": "ssh", "product": "OpenSSH", "version": "7.4", "extrainfo": "", "ostype": "", "cpe": []}
        ]
        
        await version_service._update_asset_services("192.168.1.10", services)
        
        # Verify asset was updated
        assert mock_asset.services == services
        assert mock_db.commit.called
    
    @pytest.mark.asyncio
    async def test_missing_asset_logs_warning(self, version_service, mock_db):
        """Test missing asset logs warning"""
        # Mock no asset found
        result = Mock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result
        
        services = [{"port": 22, "protocol": "tcp", "service": "ssh", "product": "", "version": "", "extrainfo": "", "ostype": "", "cpe": []}]
        
        # Should not raise exception
        await version_service._update_asset_services("192.168.1.99", services)
        
        # Commit should not be called
        assert not mock_db.commit.called


class TestCPEExtraction:
    """Test CPE identifier extraction"""
    
    def test_extract_cpe_from_service(self, version_service):
        """Test CPE extraction from service data"""
        service = {
            "port": 22,
            "protocol": "tcp",
            "service": "ssh",
            "cpe": ["cpe:/a:openbsd:openssh:7.4", "cpe:/o:linux:kernel"]
        }
        
        cpe_list = version_service.extract_cpe_from_service(service)
        
        assert len(cpe_list) == 2
        assert "cpe:/a:openbsd:openssh:7.4" in cpe_list
    
    def test_build_product_query(self, version_service):
        """Test product query building from service"""
        service = {
            "product": "Apache httpd",
            "version": "2.4.29"
        }
        
        query = version_service.build_product_query(service)
        
        assert query is not None
        assert "apache" in query["product"].lower()
        assert query["version"] == "2.4.29"
        assert query["vendor"] == "apache"
    
    def test_build_product_query_returns_none_for_incomplete(self, version_service):
        """Test query building returns None for incomplete data"""
        # Missing version
        service1 = {"product": "Apache", "version": ""}
        assert version_service.build_product_query(service1) is None
        
        # Missing product
        service2 = {"product": "", "version": "2.4"}
        assert version_service.build_product_query(service2) is None
