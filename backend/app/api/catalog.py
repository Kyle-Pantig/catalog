from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timedelta
from app.core.database import prisma
from app.core.security import get_current_user
from app.models.schemas import CatalogCreate, CatalogUpdate, CatalogResponse, CatalogWithItems, ItemCreate, ItemUpdate, ItemResponse, ReorderImagesRequest
from app.utils.timezone import get_ph_time_utc
from typing import List

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.post("", response_model=CatalogResponse)
async def create_catalog(
    catalog: CatalogCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new catalog (Owner only)"""
    try:
        # Create catalog with Supabase user ID
        new_catalog = await prisma.catalog.create(data={
            "title": catalog.title,
            "description": catalog.description,
            "ownerId": current_user["id"]
        })
        
        return new_catalog
    except Exception as e:
        import traceback
        print(f"Error creating catalog: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Failed to create catalog: {str(e)}")


@router.get("/my", response_model=List[CatalogWithItems])
async def get_my_catalogs(
    current_user: dict = Depends(get_current_user)
):
    """Get all catalogs owned by the current user"""
    try:
        catalogs = await prisma.catalog.find_many(
            where={"ownerId": current_user["id"]},
            include={
                "items": {
                    "include": {"images": {"order_by": {"order": "asc"}}}
                },
                "shareCodes": True
            },
            order={"createdAt": "desc"}
        )
        return catalogs
    except Exception as e:
        import traceback
        print(f"Error fetching catalogs: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Failed to fetch catalogs: {str(e)}")


@router.put("/{catalog_id}", response_model=CatalogResponse)
async def update_catalog(
    catalog_id: str,
    catalog_update: CatalogUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a catalog (Owner only)"""
    try:
        # Verify ownership
        catalog = await prisma.catalog.find_unique(where={"id": catalog_id})
        if not catalog:
            raise HTTPException(status_code=404, detail="Catalog not found")
        
        if catalog.ownerId != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to update this catalog")
        
        # Prepare update data (only include fields that are provided)
        update_data = {}
        if catalog_update.title is not None:
            update_data["title"] = catalog_update.title
        if catalog_update.description is not None:
            update_data["description"] = catalog_update.description
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update catalog
        updated_catalog = await prisma.catalog.update(
            where={"id": catalog_id},
            data=update_data
        )
        
        return updated_catalog
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error updating catalog: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Failed to update catalog: {str(e)}")


@router.delete("/{catalog_id}")
async def delete_catalog(
    catalog_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a catalog (Owner only)"""
    try:
        # Verify ownership
        catalog = await prisma.catalog.find_unique(where={"id": catalog_id})
        if not catalog:
            raise HTTPException(status_code=404, detail="Catalog not found")
        
        if catalog.ownerId != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this catalog")
        
        # Delete catalog (cascade will delete items and share codes)
        await prisma.catalog.delete(where={"id": catalog_id})
        
        return {"message": "Catalog deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete catalog: {str(e)}")


@router.post("/{catalog_id}/items", response_model=ItemResponse)
async def create_item(
    catalog_id: str,
    item: ItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add an item to a catalog (Owner only)"""
    try:
        # Verify ownership
        catalog = await prisma.catalog.find_unique(where={"id": catalog_id})
        if not catalog:
            raise HTTPException(status_code=404, detail="Catalog not found")
        
        if catalog.ownerId != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to add items to this catalog")
        
        # Create item
        new_item = await prisma.item.create(
            data={
            "catalogId": catalog_id,
            "name": item.name,
            "price": item.price
            },
            include={"images": True}
        )
        
        # Create images if provided
        if item.images:
            for idx, image_url in enumerate(item.images):
                await prisma.itemimage.create(data={
                    "itemId": new_item.id,
                    "url": image_url,
                    "order": idx
                })
            
            # Refetch item with images
            new_item = await prisma.item.find_unique(
                where={"id": new_item.id},
                include={"images": {"order_by": {"order": "asc"}}}
            )
        
        return new_item
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error creating item: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Failed to create item: {str(e)}")


@router.put("/{catalog_id}/items/{item_id}", response_model=ItemResponse)
async def update_item(
    catalog_id: str,
    item_id: str,
    item_update: ItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an item in a catalog (Owner only)"""
    try:
        # Verify ownership
        catalog = await prisma.catalog.find_unique(where={"id": catalog_id})
        if not catalog:
            raise HTTPException(status_code=404, detail="Catalog not found")
        
        if catalog.ownerId != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to update items in this catalog")
        
        # Verify item exists and belongs to catalog
        item = await prisma.item.find_unique(where={"id": item_id})
        if not item or item.catalogId != catalog_id:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Prepare update data
        update_data = {}
        if item_update.name is not None:
            update_data["name"] = item_update.name
        if item_update.price is not None:
            update_data["price"] = item_update.price
        
        # Update item if there are changes
        if update_data:
            await prisma.item.update(
                where={"id": item_id},
                data=update_data
            )
        
        # Handle images update - replace all existing images
        if item_update.images is not None:
            # Delete existing images
            await prisma.itemimage.delete_many(where={"itemId": item_id})
            
            # Create new images
            for idx, image_url in enumerate(item_update.images):
                await prisma.itemimage.create(data={
                    "itemId": item_id,
                    "url": image_url,
                    "order": idx
                })
        
        # Fetch updated item with images
        updated_item = await prisma.item.find_unique(
            where={"id": item_id},
            include={"images": {"order_by": {"order": "asc"}}}
        )
        
        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error updating item: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Failed to update item: {str(e)}")


@router.delete("/{catalog_id}/items/{item_id}")
async def delete_item(
    catalog_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an item from a catalog (Owner only)"""
    try:
        # Verify ownership
        catalog = await prisma.catalog.find_unique(where={"id": catalog_id})
        if not catalog:
            raise HTTPException(status_code=404, detail="Catalog not found")
        
        if catalog.ownerId != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete items from this catalog")
        
        # Verify item exists and belongs to catalog
        item = await prisma.item.find_unique(where={"id": item_id})
        if not item or item.catalogId != catalog_id:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Delete item (cascade will delete images)
        await prisma.item.delete(where={"id": item_id})
        
        return {"message": "Item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete item: {str(e)}")


@router.put("/{catalog_id}/items/{item_id}/reorder-images", response_model=ItemResponse)
async def reorder_item_images(
    catalog_id: str,
    item_id: str,
    reorder_request: ReorderImagesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reorder images for an item (Owner only)"""
    try:
        # Verify ownership
        catalog = await prisma.catalog.find_unique(where={"id": catalog_id})
        if not catalog:
            raise HTTPException(status_code=404, detail="Catalog not found")
        
        if catalog.ownerId != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to update items in this catalog")
        
        # Verify item exists and belongs to catalog
        item = await prisma.item.find_unique(where={"id": item_id})
        if not item or item.catalogId != catalog_id:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Update order for each image
        for image_order in reorder_request.images:
            await prisma.itemimage.update(
                where={"id": image_order.id},
                data={"order": image_order.order}
            )
        
        # Fetch updated item with images
        updated_item = await prisma.item.find_unique(
            where={"id": item_id},
            include={"images": {"order_by": {"order": "asc"}}}
        )
        
        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error reordering images: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Failed to reorder images: {str(e)}")


@router.get("/view/{code}", response_model=CatalogWithItems)
async def view_catalog_by_code(code: str, request: Request):
    """View a catalog using a share code (Public endpoint)"""
    try:
        # Get client IP address
        client_ip = request.client.host if request.client else None
        # Try to get real IP from headers (for proxies/load balancers)
        if not client_ip:
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                client_ip = forwarded_for.split(",")[0].strip()
            else:
                client_ip = request.headers.get("X-Real-IP", "unknown")
        
        # Find share code
        share_code = await prisma.sharecode.find_unique(
            where={"code": code},
            include={
                "catalog": {
                    "include": {
                        "items": {
                            "include": {"images": {"order_by": {"order": "asc"}}}
                        }
                    }
                }
            }
        )
        
        if not share_code or not share_code.isActive:
            raise HTTPException(status_code=403, detail="Invalid or inactive code")
        
        # Check expiration (using Philippines time)
        if share_code.expiresAt:
            # Ensure both datetimes are naive for comparison
            expires_at = share_code.expiresAt
            if expires_at.tzinfo is not None:
                expires_at = expires_at.replace(tzinfo=None)
            current_time = get_ph_time_utc()
            if expires_at < current_time:
                # Deactivate the code as a safety measure
                try:
                    await prisma.sharecode.update(
                        where={"id": share_code.id},
                        data={"isActive": False}
                    )
                except Exception:
                    pass  # Continue even if deactivation fails
                raise HTTPException(status_code=403, detail="Code has expired")
        
        # Check if code has already been used
        if share_code.usedAt:
            # Allow same IP to access again (in case of page refresh)
            if share_code.usedByIp != client_ip:
                raise HTTPException(status_code=403, detail="This share code has already been used")
        else:
            # Mark code as used with current IP (using Philippines time)
            await prisma.sharecode.update(
                where={"id": share_code.id},
                data={
                    "usedAt": get_ph_time_utc(),
                    "usedByIp": client_ip
                }
            )
        
        catalog = share_code.catalog
        
        return {
            "id": catalog.id,
            "title": catalog.title,
            "description": catalog.description,
            "ownerId": catalog.ownerId,
            "createdAt": catalog.createdAt,
            "items": catalog.items,
            "shareCodes": []  # Don't expose share codes to viewers
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch catalog: {str(e)}")
