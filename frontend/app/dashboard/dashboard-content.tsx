'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CatalogsChart } from '@/components/catalogs-chart'
import { CatalogsPieChart } from '@/components/catalogs-pie-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { catalogApi } from '@/lib/api'

export function DashboardContent({ userEmail }: { userEmail?: string | null }) {
  const { data: catalogs, isLoading } = useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => {
      const { data, error } = await catalogApi.getMy()
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  })

  const catalogsList = catalogs && Array.isArray(catalogs) ? catalogs : []

  return (
    <>
      {/* Welcome Message */}
      <p className="text-lg text-muted-foreground">
        Welcome back{userEmail && <span className="font-medium text-foreground">, {userEmail}</span>}
      </p>

      {/* Charts - 2 Columns */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
              <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-4">
                <Skeleton className="h-6 w-[160px]" />
                <Skeleton className="h-4 w-[200px] mt-1" />
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <Skeleton className="h-6 w-[160px]" />
              <Skeleton className="h-4 w-[180px] mt-1" />
            </CardHeader>
            <CardContent className="flex-1 pb-0 flex items-center justify-center">
              <Skeleton className="aspect-square max-h-[250px] w-[250px] rounded-full" />
            </CardContent>
          </Card>
        </div>
      ) : catalogsList.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CatalogsChart catalogs={catalogsList} />
          <CatalogsPieChart catalogs={catalogsList} />
        </div>
      ) : null}

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
    </>
  )
}

