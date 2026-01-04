-- Add variantOptions column to ItemImage table
ALTER TABLE "ItemImage" ADD COLUMN IF NOT EXISTS "variantOptions" JSONB;

