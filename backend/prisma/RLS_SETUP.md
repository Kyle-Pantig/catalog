# Row Level Security (RLS) Setup Guide

This guide explains how to set up Row Level Security (RLS) policies for the Catalog application.

## Overview

RLS policies ensure that:
- Users can only access their own catalogs, items, images, and share codes
- Public users can view catalogs only through valid, active share codes
- All data access is automatically filtered at the database level

## Prerequisites

- Supabase PostgreSQL database
- Prisma migrations have been run
- Database tables exist (Catalog, Item, ItemImage, ShareCode)

## Setup Instructions

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `prisma/migrations/rls_policies.sql`
4. Paste and run the SQL in the SQL Editor
5. Verify the policies were created successfully

### Option 2: Using psql Command Line

```bash
# Connect to your Supabase database
psql "your-database-connection-string"

# Run the SQL file
\i prisma/migrations/rls_policies.sql
```

### Option 3: Using Prisma Migrate (Custom Migration)

```bash
cd backend

# Create a new migration
prisma migrate dev --create-only --name add_rls_policies

# Copy the SQL from rls_policies.sql into the generated migration file
# Then apply the migration
prisma migrate dev
```

## Policy Summary

### Catalog Policies
- ✅ Users can view/create/update/delete their own catalogs
- ✅ Public can view catalogs with valid share codes

### Item Policies
- ✅ Users can view/create/update/delete items in their own catalogs
- ✅ Public can view items in catalogs with valid share codes

### ItemImage Policies
- ✅ Users can view/create/update/delete images for items in their own catalogs
- ✅ Public can view images for items in catalogs with valid share codes

### ShareCode Policies
- ✅ Users can view/create/update/delete share codes for their own catalogs
- ✅ Public can view active share codes (for validation)

## Important Notes

1. **Service Role Key**: The backend uses the Supabase service role key, which bypasses RLS. This is intentional for the FastAPI backend to work properly.

2. **Public Access**: Public policies allow viewing catalogs via share codes, but the backend still validates:
   - Share code exists and is active
   - Share code hasn't expired
   - Share code hasn't been used (one-time use logic)

3. **Authentication**: RLS policies use `auth.uid()` which requires Supabase Auth. Make sure your backend is properly authenticating users.

4. **Testing**: After applying RLS policies:
   - Test that authenticated users can only see their own data
   - Test that public users cannot access catalogs without valid share codes
   - Test that share codes work correctly for public viewing

## Troubleshooting

### Error: "permission denied for table"
- Make sure RLS is enabled on the table
- Check that the user has the necessary permissions

### Error: "function auth.uid() does not exist"
- This means Supabase Auth is not properly set up
- Ensure you're using Supabase PostgreSQL, not a standalone PostgreSQL instance
- Verify Supabase Auth extension is enabled

### Policies not working
- Check that RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'Catalog';`
- Check Supabase logs for policy violations

## Disabling RLS (Not Recommended)

If you need to temporarily disable RLS for testing:

```sql
ALTER TABLE "Catalog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Item" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ItemImage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ShareCode" DISABLE ROW LEVEL SECURITY;
```

⚠️ **Warning**: Only disable RLS for development/testing. Never disable it in production.

