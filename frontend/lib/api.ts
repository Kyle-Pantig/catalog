const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ApiError {
  detail: string
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('access_token') 
      : null

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
  create: async (title: string, description?: string) => {
    return apiRequest('/catalog', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    })
  },
  getMy: async () => {
    return apiRequest('/catalog/my')
  },
  update: async (id: string, data: { title?: string; description?: string }) => {
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
  addItem: async (catalogId: string, item: { name: string; images?: string[]; price?: number }) => {
    return apiRequest(`/catalog/${catalogId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    })
  },
  updateItem: async (catalogId: string, itemId: string, item: { name?: string; images?: string[]; price?: number }) => {
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

