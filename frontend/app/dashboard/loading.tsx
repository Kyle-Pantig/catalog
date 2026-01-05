import { Skeleton } from "@/components/ui/skeleton"

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

        {/* Charts placeholder */}
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[350px] w-full rounded-lg" />
          <Skeleton className="h-[350px] w-full rounded-lg" />
        </div>

        {/* Quick Stats placeholder */}
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[180px] w-full rounded-lg" />
          <Skeleton className="h-[180px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
