"""
Streaming ping endpoint for real-time packet updates
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services.PingService import ping_service
from app.schemas.traffic import PingRequest
import json
import asyncio

router = APIRouter()

@router.post("/ping/stream")
async def ping_stream(request: PingRequest):
    """Stream ping results in real-time as packets arrive"""
    
    async def generate():
        try:
            # Send initial status
            yield f"data: {json.dumps({'type': 'start', 'target': request.target, 'protocol': request.protocol})}\n\n"
            
            async for result in ping_service.streaming_ping(
                target=request.target,
                protocol=request.protocol,
                port=request.port,
                count=request.count,
                timeout=request.timeout,
                packet_size=request.packet_size,
                use_https=request.use_https
            ):
                # Send each packet result as it arrives
                yield f"data: {json.dumps({'type': 'packet', 'data': result})}\n\n"
                
            # Send completion
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
