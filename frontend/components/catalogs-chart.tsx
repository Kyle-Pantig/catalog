"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

type CatalogsChartProps = {
  catalogs: Array<{
    id: string
    title: string
    items: Array<{ id: string }>
  }>
}

const chartConfig = {
  items: {
    label: "Items",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function CatalogsChart({ catalogs }: CatalogsChartProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const chartData = React.useMemo(() => {
    if (!catalogs || catalogs.length === 0) return []
    return catalogs.map((catalog) => ({
      catalog: catalog.title.length > 20 
        ? `${catalog.title.substring(0, 20)}...` 
        : catalog.title,
      items: catalog.items?.length || 0,
    }))
  }, [catalogs])

  const totalItems = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.items, 0),
    [chartData]
  )

  if (catalogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Catalogs Overview</CardTitle>
          <CardDescription>
            No catalogs available. Create your first catalog to see the chart.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Show skeleton during SSR to avoid Recharts dimension warnings
  if (!mounted) {
    return (
      <Card>
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
            <CardTitle>Catalogs Overview</CardTitle>
            <CardDescription>Number of items in each catalog</CardDescription>
          </div>
          <div className="flex">
            <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
              <span className="text-muted-foreground text-xs">{chartConfig.items.label}</span>
              <span className="text-lg leading-none font-bold sm:text-3xl">{totalItems.toLocaleString()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>Catalogs Overview</CardTitle>
          <CardDescription>
            Number of items in each catalog
          </CardDescription>
        </div>
        <div className="flex">
          <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-muted-foreground text-xs">
              {chartConfig.items.label}
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {totalItems.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="catalog"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="items"
                  labelFormatter={(value: any) => {
                    const catalog = catalogs?.find(
                      (c) => c.title.length > 20 
                        ? c.title.substring(0, 20) + "..." === value
                        : c.title === value
                    )
                    return catalog?.title || value
                  }}
                />
              }
            />
            <Bar dataKey="items" fill={`var(--color-items)`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

