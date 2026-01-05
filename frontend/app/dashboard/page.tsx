import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { serverCatalogApi } from '@/lib/api-server'
import { CatalogsChart } from '@/components/catalogs-chart'
import { CatalogsPieChart } from '@/components/catalogs-pie-chart'
import { MainHeader } from './main-header'

export default async function DashboardPage() {
  // Server-side auth check - use getUser() for secure verification
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // Fetch catalogs on the server
  const { data: catalogs, error } = await serverCatalogApi.getMy()
  
  const catalogsList = catalogs && Array.isArray(catalogs) ? catalogs : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {/* Client-side header with logout functionality */}
        <MainHeader userEmail={user.email} />

        {/* Welcome Message */}
        <p className="text-lg text-muted-foreground">
          Welcome back{user.email && <span className="font-medium text-foreground">, {user.email}</span>}
        </p>

        {/* Charts - 2 Columns */}
        {catalogsList.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <CatalogsChart catalogs={catalogsList} />
            <CatalogsPieChart catalogs={catalogsList} />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">My Catalogs</CardTitle>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <CardDescription className="text-base mt-2">
                Create and manage your product catalogs with ease
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/catalogs">
                <Button className="w-full" size="lg">Manage Catalogs</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Share Codes</CardTitle>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
              </div>
              <CardDescription className="text-base mt-2">
                Generate secure share codes to control access to your catalogs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/share">
                <Button variant="outline" className="w-full" size="lg">Manage Share Codes</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
