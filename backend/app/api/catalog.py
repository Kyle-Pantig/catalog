from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timedelta
from prisma import Json
from app.core.database import prisma
from app.core.security import get_current_user
from app.models.schemas import CatalogCreate, CatalogUpdate, CatalogResponse, CatalogWithItems, ItemCreate, ItemUpdate, ItemResponse, ReorderImagesRequest
from app.utils.timezone import get_ph_time_utc
from app.utils.storage import delete_images_from_storage
from typing import List
import asyncio

router = APIRouter(prefix="/catalog", tags=["catalog"])


async def verify_catalog_ownership(catalog_id: str, user_id: str) -> bool:
    """Verify catalog ownership"""
    catalog = await prisma.catalog.find_unique(where={"id": catalog_id})
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")
    if catalog.ownerId != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return True


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
        # Verify ownership with minimal query
        await verify_catalog_ownership(catalog_id, current_user["id"])
        
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
        # Verify ownership with minimal query
        await verify_catalog_ownership(catalog_id, current_user["id"])
        
        # Get all items with their images before deleting
        catalog = await prisma.catalog.find_unique(
            where={"id": catalog_id},
            include={"items": {"include": {"images": True}}}
        )
        
        # Collect all image URLs
        image_urls = []
        if catalog and catalog.items:
            for item in catalog.items:
                if item.images:
                    image_urls.extend([img.url for img in item.images])
        
        # Delete catalog from database (cascade will delete items and share codes)
        await prisma.catalog.delete(where={"id": catalog_id})
        
        # Delete images from Supabase storage (do this after DB delete succeeds)
        if image_urls:
            try:
                await delete_images_from_storage(image_urls)
            except Exception as e:
                # Log error but don't fail the request - DB deletion already succeeded
                print(f"Warning: Failed to delete some images from storage: {str(e)}")
        
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
        # Verify ownership with minimal query
        await verify_catalog_ownership(catalog_id, current_user["id"])
        
        # Prepare specifications as JSON if provided
        specs_json = None
        if item.specifications:
            specs = [{"label": spec.label, "value": spec.value} for spec in item.specifications]
            if specs:
                specs_json = Json(specs)
        
        # Prepare variants as JSON if provided
        variants_json = None
        if item.variants:
            vars_data = []
            for var in item.variants:
                options_data = []
                for opt in var.options:
                    opt_dict = {"value": opt.value}
                    if opt.specifications:
                        opt_dict["specifications"] = [{"label": s.label, "value": s.value} for s in opt.specifications]
                    options_data.append(opt_dict)
                vars_data.append({"name": var.name, "options": options_data})
            if vars_data:
                variants_json = Json(vars_data)
        
        # Build create data - only include fields that have values
        create_data = {
            "catalogId": catalog_id,
            "name": item.name,
        }
        
        if item.description:
            create_data["description"] = item.description
        
        if specs_json is not None:
            create_data["specifications"] = specs_json
        
        if variants_json is not None:
            create_data["variants"] = variants_json
        
        # Add images if provided
        if item.images:
            create_data["images"] = {"create": [{"url": url, "order": idx} for idx, url in enumerate(item.images)]}
        
        new_item = await prisma.item.create(
            data=create_data,
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
        await verify_catalog_ownership(catalog_id, current_user["id"])
        
        # Verify item exists and belongs to catalog
        item = await prisma.item.find_unique(where={"id": item_id})
        if not item or item.catalogId != catalog_id:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Prepare update data
        update_data = {}
        if item_update.name is not None:
            update_data["name"] = item_update.name
        if item_update.description is not None:
            update_data["description"] = item_update.description if item_update.description else None
        if item_update.specifications is not None:
            specs = [{"label": spec.label, "value": spec.value} for spec in item_update.specifications]
            update_data["specifications"] = Json(specs) if specs else Json(None)
        if item_update.variants is not None:
            vars_data = []
            for var in item_update.variants:
                options_data = []
                for opt in var.options:
                    opt_dict = {"value": opt.value}
                    if opt.specifications:
                        opt_dict["specifications"] = [{"label": s.label, "value": s.value} for s in opt.specifications]
                    options_data.append(opt_dict)
                vars_data.append({"name": var.name, "options": options_data})
            update_data["variants"] = Json(vars_data) if vars_data else Json(None)
        
        # Handle images - use nested operations for efficiency
        if item_update.images is not None:
            image_data = [{"url": url, "order": idx} for idx, url in enumerate(item_update.images)]
            # Delete all existing and create new in one update operation
            update_data["images"] = {
                "deleteMany": {},  # Delete all existing images
                "create": image_data  # Create new images
            }
        
        # Single update operation with all changes
        updated_item = await prisma.item.update(
            where={"id": item_id},
            data=update_data,
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
        await verify_catalog_ownership(catalog_id, current_user["id"])
        
        # Verify item exists and belongs to catalog, include images
        item = await prisma.item.find_unique(
            where={"id": item_id},
            include={"images": True}
        )
        if not item or item.catalogId != catalog_id:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Get image URLs before deleting from database
        image_urls = [img.url for img in item.images] if item.images else []
        
        # Delete item from database (cascade will delete image records)
        await prisma.item.delete(where={"id": item_id})
        
        # Delete images from Supabase storage (do this after DB delete succeeds)
        if image_urls:
            try:
                await delete_images_from_storage(image_urls)
            except Exception as e:
                # Log error but don't fail the request - DB deletion already succeeded
                print(f"Warning: Failed to delete some images from storage: {str(e)}")
        
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
        await verify_catalog_ownership(catalog_id, current_user["id"])
        
        # Verify item exists and belongs to catalog
        item = await prisma.item.find_unique(where={"id": item_id})
        if not item or item.catalogId != catalog_id:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Update all image orders in parallel using asyncio.gather
        update_tasks = [
            prisma.itemimage.update(
                where={"id": image_order.id},
                data={"order": image_order.order}
            )
            for image_order in reorder_request.images
        ]
        await asyncio.gather(*update_tasks)
        
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
