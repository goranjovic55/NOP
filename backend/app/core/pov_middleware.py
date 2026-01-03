"""
POV (Point of View) Middleware

This middleware intercepts requests and adds agent context when a user
is viewing data from a specific agent's perspective.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional
from uuid import UUID


class POVMiddleware(BaseHTTPMiddleware):
    """Middleware to handle agent POV (Point of View) switching"""
    
    async def dispatch(self, request: Request, call_next):
        # Extract agent POV from header
        agent_pov = request.headers.get("X-Agent-POV")
        
        # Store in request state for use in endpoints
        if agent_pov:
            try:
                request.state.agent_pov = UUID(agent_pov)
            except (ValueError, AttributeError):
                request.state.agent_pov = None
        else:
            request.state.agent_pov = None
        
        response = await call_next(request)
        return response


def get_agent_pov(request: Request) -> Optional[UUID]:
    """
    Helper function to get agent POV from request state
    
    Usage in endpoints:
        agent_pov = get_agent_pov(request)
        if agent_pov:
            # Filter by agent_id
    """
    return getattr(request.state, "agent_pov", None)
