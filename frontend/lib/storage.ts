import { supabase } from './supabase'

const BUCKET_NAME = 'catalog-images'
const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1MB in bytes

export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    return { 
      valid: false, 
      error: `File "${file.name}" is ${sizeMB}MB. Maximum size is 1MB.` 
    }
  }
  return { valid: true }
}

export function validateMultipleFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  for (const file of files) {
    const result = validateFileSize(file)
    if (!result.valid && result.error) {
      errors.push(result.error)
    }
  }
  return { valid: errors.length === 0, errors }
}

export async function uploadImage(
  file: File, 
  catalogId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { url: null, error: new Error('You must be logged in to upload images') }
    }

    if (!catalogId) {
      return { url: null, error: new Error('Catalog ID is required for uploading images') }
    }

    // Validate file size
    const sizeValidation = validateFileSize(file)
    if (!sizeValidation.valid) {
      return { url: null, error: new Error(sizeValidation.error) }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    // Store images in catalog-specific folders
    const filePath = `${catalogId}/${fileName}`

    console.log('Uploading to bucket:', BUCKET_NAME)
    console.log('File path:', filePath)
    console.log('File size:', file.size, 'bytes')

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { url: null, error: new Error(error.message || 'Upload failed') }
    }

    if (!data) {
      return { url: null, error: new Error('Upload succeeded but no data returned') }
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    console.log('Upload successful, public URL:', publicUrl)
    return { url: publicUrl, error: null }
  } catch (error) {
    console.error('Upload exception:', error)
    return { url: null, error: error as Error }
  }
}

export async function uploadMultipleImages(
  files: File[],
  catalogId: string
): Promise<{ urls: string[]; errors: Error[] }> {
  const urls: string[] = []
  const errors: Error[] = []

  for (const file of files) {
    const { url, error } = await uploadImage(file, catalogId)
    if (url) {
      urls.push(url)
    }
    if (error) {
      errors.push(error)
    }
  }

  return { urls, errors }
}

export async function deleteImage(
  imageUrl: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: new Error('You must be logged in to delete images') }
    }
    
    // Extract the path from the URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/catalog-images/<catalogId>/<filename>
    const urlObj = new URL(imageUrl)
    const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${BUCKET_NAME}/`)
    if (pathParts.length < 2) {
      return { success: false, error: new Error('Invalid image URL format') }
    }
    const filePath = pathParts[1]

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: new Error(error.message || 'Delete failed') }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Delete exception:', error)
    return { success: false, error: error as Error }
  }
}
