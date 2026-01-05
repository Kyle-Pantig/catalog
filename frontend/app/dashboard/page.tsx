import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { MainHeader } from './main-header'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  // Server-side auth check only - use getUser() for secure verification
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // Data fetching is done client-side with TanStack Query for caching
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {/* Client-side header with logout functionality */}
        <MainHeader userEmail={user.email} />

        {/* Client-side content with TanStack Query caching */}
        <DashboardContent userEmail={user.email} />
      </div>
    </div>
  )
}
