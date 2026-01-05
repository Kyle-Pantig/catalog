import { createSupabaseServerClient } from './supabase-server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ApiError {
  detail: string
}

export async function serverApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const supabase = await createSupabaseServerClient()
    // First verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: { detail: 'Unauthorized' } }
    }
    // Get session for the access token (safe now since user is verified)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      // Important: disable caching for authenticated requests
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      return { data: null, error: error as ApiError }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: { detail: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

// Server-side Catalog API
export const serverCatalogApi = {
  getMy: async () => {
    return serverApiRequest('/catalog/my')
  },
}

