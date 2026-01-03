import { supabase } from './supabase'
import { authApi } from './api'

export async function logout() {
  try {
    // Optionally call backend logout endpoint (for consistency)
    try {
      await authApi.logout()
    } catch (error) {
      // Continue even if backend call fails
      console.log('Backend logout call failed (non-critical):', error)
    }
    
    // Clear Supabase session
    await supabase.auth.signOut()
    
    // Clear localStorage
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    // Still clear localStorage even if Supabase signOut fails
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    return { success: true, error }
  }
}

