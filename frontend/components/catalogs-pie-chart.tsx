"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type CatalogsPieChartProps = {
  catalogs: Array<{
    id: string
    title: string
    items: Array<{ id: string }>
  }>
}

// Generate chart config dynamically based on catalogs
const generateChartConfig = (catalogs: CatalogsPieChartProps["catalogs"]): ChartConfig => {
  const config: ChartConfig = {
    items: {
      label: "Items",
    },
  }

  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ]

  catalogs.forEach((catalog, index) => {
    const colorIndex = index % chartColors.length
    // Use a simple key based on index
    const catalogKey = `catalog${index}`
    config[catalogKey] = {
      label: catalog.title.length > 20 
        ? `${catalog.title.substring(0, 20)}...` 
        : catalog.title,
      color: chartColors[colorIndex],
    }
  })

  return config
}

export function CatalogsPieChart({ catalogs }: CatalogsPieChartProps) {
  const chartData = React.useMemo(() => {
    if (!catalogs || catalogs.length === 0) return []

    // Filter catalogs with items first, then map
    const catalogsWithItems = catalogs.filter(catalog => (catalog.items?.length || 0) > 0)
    
    return catalogsWithItems.map((catalog, index) => {
      const itemCount = catalog.items?.length || 0
      const catalogKey = `catalog${index}`
      
      return {
        catalog: catalog.title.length > 20 
          ? `${catalog.title.substring(0, 20)}...` 
          : catalog.title,
        catalogId: catalog.id,
        items: itemCount,
        fill: `var(--color-${catalogKey})`,
        catalogKey,
      }
    })
  }, [catalogs])

  const chartConfig = React.useMemo(() => {
    // Generate config only for catalogs with items
    const catalogsWithItems = catalogs?.filter(catalog => (catalog.items?.length || 0) > 0) || []
    return generateChartConfig(catalogsWithItems)
  }, [catalogs])

  const totalItems = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.items, 0),
    [chartData]
  )

  if (!catalogs || catalogs.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Items Distribution</CardTitle>
          <CardDescription>No catalogs available</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Items Distribution</CardTitle>
          <CardDescription>No items found in your catalogs</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Items Distribution</CardTitle>
        <CardDescription>Items count per catalog</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[250px] pb-0"
        >
          <PieChart>
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  hideLabel 
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload
                      return data.catalog
                    }
                    return value
                  }}
                />
              } 
            />
            <Pie 
              data={chartData} 
              dataKey="items" 
              label={(entry: any) => {
                const catalogName = entry.catalog || entry.name || ''
                const itemCount = entry.items || entry.value || 0
                return `${catalogName}: ${itemCount}`
              }}
              nameKey="catalog" 
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Total items: {totalItems.toLocaleString()} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing distribution across {chartData.length} catalog{chartData.length !== 1 ? 's' : ''}
        </div>
      </CardFooter>
    </Card>
  )
}

