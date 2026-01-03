from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Catalog Schemas
class CatalogCreate(BaseModel):
    title: str
    description: Optional[str] = None


class CatalogUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class CatalogResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    ownerId: str
    createdAt: datetime
    
    class Config:
        from_attributes = True


# Item Image Schemas
class ItemImageCreate(BaseModel):
    url: str
    order: Optional[int] = 0


class ItemImageResponse(BaseModel):
    id: str
    itemId: str
    url: str
    order: int
    createdAt: datetime
    
    class Config:
        from_attributes = True


class ImageOrderItem(BaseModel):
    id: str
    order: int


class ReorderImagesRequest(BaseModel):
    images: List[ImageOrderItem]


# Item Schemas
class ItemCreate(BaseModel):
    name: str
    images: Optional[List[str]] = None  # List of image URLs
    price: Optional[float] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    images: Optional[List[str]] = None  # List of image URLs to replace existing
    price: Optional[float] = None


class ItemResponse(BaseModel):
    id: str
    catalogId: str
    name: str
    images: List[ItemImageResponse]
    price: Optional[float]
    createdAt: datetime
    
    class Config:
        from_attributes = True


# Share Code Schemas
class ShareCodeCreate(BaseModel):
    expiresAt: Optional[datetime] = None


class ShareCodeResponse(BaseModel):
    id: str
    code: str
    catalogId: str
    expiresAt: Optional[datetime]
    usedAt: Optional[datetime] = None
    usedByIp: Optional[str] = None
    isActive: bool
    createdAt: datetime
    
    class Config:
        from_attributes = True


# Catalog with Items
class CatalogWithItems(CatalogResponse):
    items: List[ItemResponse]
    shareCodes: List[ShareCodeResponse]

