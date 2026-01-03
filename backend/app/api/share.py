from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from app.core.database import prisma
from app.core.security import get_current_user
from app.models.schemas import ShareCodeCreate, ShareCodeResponse
from app.utils.share_code import generate_share_code
from app.utils.timezone import get_ph_time_utc

router = APIRouter(prefix="/share", tags=["share"])


@router.post("/catalog/{catalog_id}", response_model=ShareCodeResponse)
async def create_share_code(
    catalog_id: str,
    share_data: ShareCodeCreate = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate a share code for a catalog (Owner only)"""
    try:
        # Verify ownership
        catalog = await prisma.catalog.find_unique(where={"id": catalog_id})
        if not catalog:
            raise HTTPException(status_code=404, detail="Catalog not found")
        
        if catalog.ownerId != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to create share code for this catalog")
        
        # Generate unique code
        code = generate_share_code()
        # Ensure uniqueness
        while await prisma.sharecode.find_unique(where={"code": code}):
            code = generate_share_code()
        
        # Always set expiration to exactly 24 hours from now (Philippines time)
        expires_at = get_ph_time_utc() + timedelta(hours=24)
        
        # Create share code
        share_code = await prisma.sharecode.create(data={
            "code": code,
            "catalogId": catalog_id,
            "expiresAt": expires_at,
            "isActive": True
        })
        
        return share_code
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create share code: {str(e)}")


@router.delete("/{code_id}")
async def delete_share_code(
    code_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a share code (Owner only)"""
    try:
        # Find share code
        share_code = await prisma.sharecode.find_unique(
            where={"id": code_id},
            include={"catalog": True}
        )
        
        if not share_code:
            raise HTTPException(status_code=404, detail="Share code not found")
        
        # Verify ownership
        if share_code.catalog.ownerId != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this share code")
        
        # Delete share code
        await prisma.sharecode.delete(where={"id": code_id})
        
        return {"message": "Share code deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete share code: {str(e)}")


@router.get("/validate/{code}")
async def validate_share_code(code: str):
    """Validate if a share code is active, not expired, and not used"""
    try:
        share_code = await prisma.sharecode.find_unique(where={"code": code})
        
        if not share_code or not share_code.isActive:
            return {"valid": False, "message": "Invalid or inactive code"}
        
        if share_code.expiresAt:
            # Ensure both datetimes are naive for comparison
            expires_at = share_code.expiresAt
            if expires_at.tzinfo is not None:
                expires_at = expires_at.replace(tzinfo=None)
            current_time = get_ph_time_utc()
            if expires_at < current_time:
                return {"valid": False, "message": "Code has expired"}
        
        if share_code.usedAt:
            return {"valid": False, "message": "This share code has already been used"}
        
        return {"valid": True, "catalogId": share_code.catalogId}
    except Exception as e:
        return {"valid": False, "message": f"Error validating code: {str(e)}"}

