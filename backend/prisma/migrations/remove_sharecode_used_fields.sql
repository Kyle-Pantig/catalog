-- Remove usedAt and usedByIp columns from ShareCode table
ALTER TABLE "ShareCode" DROP COLUMN IF EXISTS "usedAt";
ALTER TABLE "ShareCode" DROP COLUMN IF EXISTS "usedByIp";

