from supabase import create_client
from app.core.config import settings
from typing import List, Optional
import re

BUCKET_NAME = "catalog-images"


def get_supabase_client():
    """Get Supabase client with service role key for admin operations"""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def extract_storage_path(image_url: str) -> Optional[str]:
    """Extract the storage path from a Supabase public URL
    
    URL format: https://<project>.supabase.co/storage/v1/object/public/catalog-images/<catalogId>/<filename>
    Returns: <catalogId>/<filename>
    """
    try:
        # Pattern to match the path after the bucket name
        pattern = rf'/storage/v1/object/public/{BUCKET_NAME}/(.+)$'
        match = re.search(pattern, image_url)
        if match:
            return match.group(1)
        return None
    except Exception:
        return None


async def delete_images_from_storage(image_urls: List[str]) -> dict:
    """Delete multiple images from Supabase storage
    
    Args:
        image_urls: List of public URLs of images to delete
        
    Returns:
        dict with 'deleted' count and 'errors' list
    """
    if not image_urls:
        return {"deleted": 0, "errors": []}
    
    supabase = get_supabase_client()
    deleted = 0
    errors = []
    
    # Extract paths from URLs
    paths_to_delete = []
    for url in image_urls:
        path = extract_storage_path(url)
        if path:
            paths_to_delete.append(path)
        else:
            errors.append(f"Could not extract path from URL: {url}")
    
    if not paths_to_delete:
        return {"deleted": 0, "errors": errors}
    
    try:
        # Delete all files in one batch operation
        result = supabase.storage.from_(BUCKET_NAME).remove(paths_to_delete)
        
        # Count successful deletions
        if result:
            deleted = len(paths_to_delete)
    except Exception as e:
        errors.append(f"Storage deletion error: {str(e)}")
    
    return {"deleted": deleted, "errors": errors}

