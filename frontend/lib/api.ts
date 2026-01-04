import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ApiError {
  detail: string
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    // Get token from Supabase session (handles refresh automatically)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      
      // Handle 401 Unauthorized - sign out and redirect to login
      if (response.status === 401 && typeof window !== 'undefined') {
        await supabase.auth.signOut()
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
      
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

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    return apiRequest<{ access_token: string; user: { id: string; email: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    )
  },
  logout: async () => {
    return apiRequest<{ message: string }>(
      '/auth/logout',
      {
        method: 'POST',
      }
    )
  },
}

// Catalog API
export const catalogApi = {
  create: async (title: string, description?: string, coverPhoto?: string) => {
    return apiRequest('/catalog', {
      method: 'POST',
      body: JSON.stringify({ title, description, coverPhoto }),
    })
  },
  getMy: async () => {
    return apiRequest('/catalog/my')
  },
  update: async (id: string, data: { title?: string; description?: string; coverPhoto?: string }) => {
    return apiRequest(`/catalog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  delete: async (id: string) => {
    return apiRequest(`/catalog/${id}`, {
      method: 'DELETE',
    })
  },
  addItem: async (catalogId: string, item: { name: string; description?: string; images?: string[] | Array<{ url: string; order?: number; variantOptions?: Record<string, string> }>; specifications?: { label: string; value: string }[]; variants?: { name: string; options: { value: string; specifications?: { label: string; value: string }[] }[] }[] }) => {
    return apiRequest(`/catalog/${catalogId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    })
  },
  updateItem: async (catalogId: string, itemId: string, item: { name?: string; description?: string; images?: string[] | Array<{ url: string; order?: number; variantOptions?: Record<string, string> }>; specifications?: { label: string; value: string }[]; variants?: { name: string; options: { value: string; specifications?: { label: string; value: string }[] }[] }[] }) => {
    return apiRequest(`/catalog/${catalogId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    })
  },
  deleteItem: async (catalogId: string, itemId: string) => {
    return apiRequest(`/catalog/${catalogId}/items/${itemId}`, {
      method: 'DELETE',
    })
  },
  reorderImages: async (catalogId: string, itemId: string, images: { id: string; order: number }[]) => {
    return apiRequest(`/catalog/${catalogId}/items/${itemId}/reorder-images`, {
      method: 'PUT',
      body: JSON.stringify({ images }),
    })
  },
  viewByCode: async (code: string) => {
    return apiRequest(`/catalog/view/${code}`)
  },
}

// Share API
export const shareApi = {
  create: async (catalogId: string, expiresAt?: string) => {
    return apiRequest(`/share/catalog/${catalogId}`, {
      method: 'POST',
      body: JSON.stringify({ expiresAt }),
    })
  },
  delete: async (codeId: string) => {
    return apiRequest(`/share/${codeId}`, {
      method: 'DELETE',
    })
  },
  validate: async (code: string) => {
    return apiRequest(`/share/validate/${code}`)
  },
}

