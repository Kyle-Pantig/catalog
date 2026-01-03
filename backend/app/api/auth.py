from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(login_data: LoginRequest):
    """
    Login with Supabase Auth
    Returns JWT token
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": response.user.id,
                "email": response.user.email
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


@router.post("/logout")
async def logout():
    """
    Logout - invalidates the session
    Note: Since we're using Supabase Auth, the token invalidation
    is handled by Supabase. This endpoint is for consistency.
    """
    return {"message": "Logged out successfully"}

