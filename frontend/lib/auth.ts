import { supabase } from './supabase'

export async function logout() {
  try {
    // Clear Supabase session (handles everything)
    await supabase.auth.signOut()
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: true, error }
  }
}

