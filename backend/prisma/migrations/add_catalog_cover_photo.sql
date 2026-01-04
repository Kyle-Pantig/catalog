-- Add coverPhoto column to Catalog table
ALTER TABLE "Catalog" ADD COLUMN IF NOT EXISTS "coverPhoto" TEXT;

