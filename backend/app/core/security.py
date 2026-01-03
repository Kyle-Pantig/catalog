from supabase import create_client, Client
from app.core.config import settings
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security = HTTPBearer()

# Initialize Supabase client
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify JWT token and return user information as a dictionary
    """
    try:
        token = credentials.credentials
        # Verify token with Supabase
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        # Convert User object to dictionary
        user = response.user
        return {
            "id": user.id,
            "email": user.email,
            "user_metadata": user.user_metadata if hasattr(user, 'user_metadata') else {},
            "app_metadata": user.app_metadata if hasattr(user, 'app_metadata') else {}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """
    Optional authentication - returns user if authenticated, None otherwise
    """
    if not credentials:
        return None
    try:
        token = credentials.credentials
        response = supabase.auth.get_user(token)
        if response and response.user:
            user = response.user
            return {
                "id": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata if hasattr(user, 'user_metadata') else {},
                "app_metadata": user.app_metadata if hasattr(user, 'app_metadata') else {}
            }
        return None
    except Exception:
        return None

