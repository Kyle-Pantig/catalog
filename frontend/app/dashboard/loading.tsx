import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b">
          <Skeleton className="h-10 w-[120px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[100px]" />
            <Skeleton className="h-9 w-[120px]" />
            <Skeleton className="h-9 w-[90px]" />
          </div>
        </div>

        {/* Welcome message skeleton */}
        <Skeleton className="h-7 w-[300px]" />

        {/* Charts skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
              <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-4">
                <Skeleton className="h-6 w-[160px]" />
                <Skeleton className="h-4 w-[200px] mt-1" />
              </div>
              <div className="flex border-t sm:border-t-0 sm:border-l px-6 py-4 sm:px-8 sm:py-6">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-[40px]" />
                  <Skeleton className="h-8 w-[60px]" />
                </div>
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
            <div className="p-6 pt-0 flex flex-col items-center gap-2">
              <Skeleton className="h-4 w-[140px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </Card>
        </div>

        {/* Quick Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-[120px]" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-11 w-full" />
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-[120px]" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-11 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

