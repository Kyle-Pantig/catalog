-- Enable Row Level Security on all tables
ALTER TABLE "Catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ItemImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShareCode" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CATALOG POLICIES
-- ============================================

-- Policy: Users can view their own catalogs
CREATE POLICY "Users can view own catalogs"
ON "Catalog"
FOR SELECT
TO authenticated
USING (auth.uid()::text = "ownerId");

-- Policy: Users can create their own catalogs
CREATE POLICY "Users can create own catalogs"
ON "Catalog"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "ownerId");

-- Policy: Users can update their own catalogs
CREATE POLICY "Users can update own catalogs"
ON "Catalog"
FOR UPDATE
TO authenticated
USING (auth.uid()::text = "ownerId")
WITH CHECK (auth.uid()::text = "ownerId");

-- Policy: Users can delete their own catalogs
CREATE POLICY "Users can delete own catalogs"
ON "Catalog"
FOR DELETE
TO authenticated
USING (auth.uid()::text = "ownerId");

-- Policy: Public can view catalogs via share codes (for view endpoint)
-- This allows the view_catalog_by_code endpoint to work
-- Note: The backend will still validate the share code
CREATE POLICY "Public can view catalogs with valid share code"
ON "Catalog"
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM "ShareCode"
    WHERE "ShareCode"."catalogId" = "Catalog"."id"
    AND "ShareCode"."isActive" = true
    AND ("ShareCode"."expiresAt" IS NULL OR "ShareCode"."expiresAt" > NOW())
  )
);

-- ============================================
-- ITEM POLICIES
-- ============================================

-- Policy: Users can view items in their own catalogs
CREATE POLICY "Users can view items in own catalogs"
ON "Item"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "Item"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Users can create items in their own catalogs
CREATE POLICY "Users can create items in own catalogs"
ON "Item"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "Item"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Users can update items in their own catalogs
CREATE POLICY "Users can update items in own catalogs"
ON "Item"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "Item"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "Item"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Users can delete items in their own catalogs
CREATE POLICY "Users can delete items in own catalogs"
ON "Item"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "Item"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Public can view items in catalogs with valid share codes
CREATE POLICY "Public can view items with valid share code"
ON "Item"
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM "Catalog"
    INNER JOIN "ShareCode" ON "ShareCode"."catalogId" = "Catalog"."id"
    WHERE "Catalog"."id" = "Item"."catalogId"
    AND "ShareCode"."isActive" = true
    AND ("ShareCode"."expiresAt" IS NULL OR "ShareCode"."expiresAt" > NOW())
  )
);

-- ============================================
-- ITEMIMAGE POLICIES
-- ============================================

-- Policy: Users can view images of items in their own catalogs
CREATE POLICY "Users can view images in own catalogs"
ON "ItemImage"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Item"
    INNER JOIN "Catalog" ON "Catalog"."id" = "Item"."catalogId"
    WHERE "Item"."id" = "ItemImage"."itemId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Users can create images for items in their own catalogs
CREATE POLICY "Users can create images in own catalogs"
ON "ItemImage"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Item"
    INNER JOIN "Catalog" ON "Catalog"."id" = "Item"."catalogId"
    WHERE "Item"."id" = "ItemImage"."itemId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Users can update images of items in their own catalogs
CREATE POLICY "Users can update images in own catalogs"
ON "ItemImage"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Item"
    INNER JOIN "Catalog" ON "Catalog"."id" = "Item"."catalogId"
    WHERE "Item"."id" = "ItemImage"."itemId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Item"
    INNER JOIN "Catalog" ON "Catalog"."id" = "Item"."catalogId"
    WHERE "Item"."id" = "ItemImage"."itemId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Users can delete images of items in their own catalogs
CREATE POLICY "Users can delete images in own catalogs"
ON "ItemImage"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Item"
    INNER JOIN "Catalog" ON "Catalog"."id" = "Item"."catalogId"
    WHERE "Item"."id" = "ItemImage"."itemId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Public can view images of items in catalogs with valid share codes
CREATE POLICY "Public can view images with valid share code"
ON "ItemImage"
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM "Item"
    INNER JOIN "Catalog" ON "Catalog"."id" = "Item"."catalogId"
    INNER JOIN "ShareCode" ON "ShareCode"."catalogId" = "Catalog"."id"
    WHERE "Item"."id" = "ItemImage"."itemId"
    AND "ShareCode"."isActive" = true
    AND ("ShareCode"."expiresAt" IS NULL OR "ShareCode"."expiresAt" > NOW())
  )
);

-- ============================================
-- SHARECODE POLICIES
-- ============================================

-- Policy: Users can view share codes for their own catalogs
CREATE POLICY "Users can view share codes for own catalogs"
ON "ShareCode"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "ShareCode"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Users can create share codes for their own catalogs
CREATE POLICY "Users can create share codes for own catalogs"
ON "ShareCode"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "ShareCode"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Users can update share codes for their own catalogs
CREATE POLICY "Users can update share codes for own catalogs"
ON "ShareCode"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "ShareCode"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "ShareCode"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Users can delete share codes for their own catalogs
CREATE POLICY "Users can delete share codes for own catalogs"
ON "ShareCode"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Catalog"
    WHERE "Catalog"."id" = "ShareCode"."catalogId"
    AND "Catalog"."ownerId" = auth.uid()::text
  )
);

-- Policy: Public can view active share codes (for validation)
-- This allows the view endpoint to check if a share code exists and is valid
CREATE POLICY "Public can view active share codes"
ON "ShareCode"
FOR SELECT
TO public
USING (
  "isActive" = true
  AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
);

