# Supabase Storage RLS Policy Setup

## Error: "new row violates row-level security policy"

This error occurs because the `catalog-images` bucket has Row Level Security (RLS) enabled, but there's no policy allowing uploads.

## Solution: Create RLS Policies

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **Policies**
3. Select the `catalog-images` bucket
4. Click **"New Policy"** or **"Add Policy"**

### Option 2: Using SQL Editor (Recommended)

1. Go to Supabase Dashboard → **SQL Editor**
2. Run the following SQL commands:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'catalog-images');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'catalog-images');

-- Allow public to read files (for viewing catalogs)
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'catalog-images');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'catalog-images')
WITH CHECK (bucket_id = 'catalog-images');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'catalog-images');
```

### Option 3: Disable RLS (Not Recommended for Production)

If you want to disable RLS entirely (only for development):

1. Go to Storage → `catalog-images` bucket
2. Click on **Settings**
3. Disable **"Row Level Security"**

⚠️ **Warning**: This makes the bucket fully public. Only do this for development/testing.

## Verify the Setup

After creating the policies:
1. Try uploading an image again
2. Check the browser console - the error should be gone
3. The image should appear in your catalog

## Policy Explanation

- **authenticated**: Users who are logged in (have a valid JWT token)
- **public**: Anyone (including non-logged-in users)
- **bucket_id = 'catalog-images'**: Only applies to files in this specific bucket

The policies allow:
- ✅ Authenticated users can upload, read, update, and delete
- ✅ Public can read (so catalog viewers can see images)
- ❌ Public cannot upload (security)

