"""
Vulnerability endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.services.cve_lookup import CVELookupService, RateLimitExceeded
from app.services.exploit_match import ExploitMatchService

router = APIRouter()


class CVELookupRequest(BaseModel):
    """Request for CVE lookup"""
    cve_id: Optional[str] = None
    product: Optional[str] = None
    version: Optional[str] = None
    vendor: Optional[str] = None


class CVELookupResponse(BaseModel):
    """Response for CVE lookup"""
    cve_id: str
    title: Optional[str]
    description: Optional[str]
    cvss_score: Optional[float]
    cvss_vector: Optional[str]
    severity: Optional[str]
    cpe_list: List[str] = []
    affected_products: List[dict] = []
    references: List[str] = []
    cached_at: Optional[str] = None


class ExploitModuleResponse(BaseModel):
    """Response for exploit module"""
    id: str
    cve_id: str
    platform: str
    module_id: Optional[str]
    module_path: Optional[str]
    title: str
    description: Optional[str]
    exploit_type: str
    target_platform: Optional[str]
    rank: Optional[str]
    verified: bool
    exploit_db_id: Optional[int]
    reference_url: Optional[str]


@router.post("/lookup-cve")
async def lookup_cve(
    request: CVELookupRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Lookup CVE information from NVD API (with caching)
    
    Args:
        request: CVE lookup parameters (cve_id OR product+version)
        
    Returns:
        CVE information or list of CVEs
    """
    try:
        service = CVELookupService(db)
        
        # Lookup by CVE ID
        if request.cve_id:
            result = await service.lookup_by_cve(request.cve_id)
            if not result:
                raise HTTPException(status_code=404, detail=f"CVE {request.cve_id} not found")
            return result
        
        # Lookup by product/version
        elif request.product and request.version:
            results = await service.lookup_by_product_version(
                product=request.product,
                version=request.version,
                vendor=request.vendor
            )
            return {"cves": results, "count": len(results)}
        
        else:
            raise HTTPException(
                status_code=400, 
                detail="Either cve_id or product+version must be provided"
            )
        
    except RateLimitExceeded:
        raise HTTPException(
            status_code=429,
            detail="NVD API rate limit exceeded. Please try again in 30 seconds."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CVE lookup failed: {str(e)}")


@router.get("/exploits/{cve_id}", response_model=List[ExploitModuleResponse])
async def get_exploits_for_cve(
    cve_id: str,
    db: AsyncSession = Depends(get_db)
) -> List[ExploitModuleResponse]:
    """
    Get available exploit modules for a CVE
    
    Args:
        cve_id: CVE identifier (e.g., CVE-2023-1234)
        
    Returns:
        List of exploit modules
    """
    try:
        service = ExploitMatchService(db)
        exploits = await service.get_exploits_for_cve(cve_id)
        
        return [ExploitModuleResponse(**e) for e in exploits]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch exploits: {str(e)}")
