from pydantic import BaseModel
from typing import Optional, List, Dict, Any
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


# Specification Schema
class SpecificationItem(BaseModel):
    label: str
    value: str


# Variant Option Schema - each option can have its own specifications
class VariantOptionItem(BaseModel):
    value: str  # e.g. "S", "M", "L" or "Red", "Blue"
    specifications: Optional[List[SpecificationItem]] = None  # Specs specific to this option


# Variant Schema
class VariantItem(BaseModel):
    name: str  # e.g. "Size", "Color", "Material"
    options: List[VariantOptionItem]  # Each option can have its own specs


# Item Schemas
class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    images: Optional[List[str]] = None  # List of image URLs
    specifications: Optional[List[SpecificationItem]] = None  # Custom specs like [{label: "Length", value: "10cm"}]
    variants: Optional[List[VariantItem]] = None  # Variants like [{name: "Size", options: ["S", "M", "L"]}]


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None  # List of image URLs to replace existing
    specifications: Optional[List[SpecificationItem]] = None
    variants: Optional[List[VariantItem]] = None


class ItemResponse(BaseModel):
    id: str
    catalogId: str
    name: str
    description: Optional[str]
    images: List[ItemImageResponse]
    specifications: Optional[List[Dict[str, Any]]]
    variants: Optional[List[Dict[str, Any]]]
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
    isActive: bool
    createdAt: datetime
    
    class Config:
        from_attributes = True


# Catalog with Items
class CatalogWithItems(CatalogResponse):
    items: List[ItemResponse]
    shareCodes: List[ShareCodeResponse]

