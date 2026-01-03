'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { DashboardHeader } from '@/components/dashboard-header'
import { catalogApi, shareApi } from '@/lib/api'
import { useCountdown } from '@/lib/use-countdown'
import { toast } from 'sonner'
import Link from 'next/link'

export default function SharePage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: catalogs, isLoading } = useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => {
      const { data, error } = await catalogApi.getMy()
      if (error) throw new Error(error.detail)
      return data
    },
  })

  const createShareCodeMutation = useMutation({
    mutationFn: async (catalogId: string) => {
      const { data, error } = await shareApi.create(catalogId)
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Share code created successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteShareCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const { data, error } = await shareApi.delete(codeId)
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Share code deleted successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardHeader
          title="Share Codes"
          description="Generate and manage secure share codes for your catalogs"
          backButton={{
            href: "/dashboard",
            label: "Dashboard"
          }}
        />

        {isLoading ? (
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-2 flex-1 w-full sm:w-auto">
                      <Skeleton className="h-6 w-full sm:w-48" />
                      <Skeleton className="h-4 w-full sm:w-64" />
                    </div>
                    <Skeleton className="h-10 w-full sm:w-32" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <div className="space-y-3">
                      {[...Array(2)].map((_, j) => (
                        <div key={j} className="p-4 bg-muted rounded-lg border space-y-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Skeleton className="h-5 w-20 sm:w-24" />
                              <Skeleton className="h-5 w-12 sm:w-16" />
                            </div>
                            <Skeleton className="h-8 w-8 sm:w-20" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Skeleton className="h-4 w-full sm:w-32" />
                            <Skeleton className="h-4 w-full sm:w-32" />
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            <Skeleton className="h-8 flex-1" />
                            <Skeleton className="h-8 flex-1" />
                          </div>
          </div>
                      ))}
          </div>
        </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : catalogs && (catalogs as any[]).length > 0 ? (
          <div className="grid gap-6">
            {(catalogs as any[]).map((catalog: any) => (
              <Card key={catalog.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{catalog.title}</CardTitle>
                      <CardDescription>{catalog.description || 'No description'}</CardDescription>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span>{catalog.items?.length || 0} {catalog.items?.length === 1 ? 'item' : 'items'}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => createShareCodeMutation.mutate(catalog.id)}
                      disabled={createShareCodeMutation.isPending}
                    >
                      {createShareCodeMutation.isPending ? 'Generating...' : 'Generate Code'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {catalog.shareCodes && catalog.shareCodes.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Share Codes:</p>
                      <div className="space-y-3">
                        {catalog.shareCodes.map((code: any) => (
                          <ShareCodeItem
                            key={code.id}
                            code={code}
                            onDelete={() => deleteShareCodeMutation.mutate(code.id)}
                            isDeleting={deleteShareCodeMutation.isPending}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No share codes yet. Generate one to get started!</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No catalogs yet. Create a catalog first!</p>
              <Link href="/dashboard/catalogs">
                <Button className="mt-4">Create Catalog</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function ShareCodeItem({ code, onDelete, isDeleting }: { code: any; onDelete: () => void; isDeleting: boolean }) {
  const countdown = useCountdown(code.expiresAt)
  const isUsed = !!code.usedAt
  const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date()
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/view/${code.code}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="p-4 bg-muted rounded-lg border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <code className="text-sm font-mono font-semibold">{code.code}</code>
          {isUsed ? (
            <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded">
              Used
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
              Active
            </span>
          )}
        </div>
        <DeleteConfirmDialog
          title="Delete Share Code"
          description={`Are you sure you want to delete share code "${code.code}"? This action cannot be undone.`}
          onConfirm={onDelete}
          isDeleting={isDeleting}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </Button>
        </DeleteConfirmDialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Expires:</span>
          <span className={isExpired ? 'text-destructive font-medium' : 'font-medium'}>
            {isExpired ? 'Expired' : countdown}
          </span>
        </div>
        {isUsed && code.usedByIp && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Used by IP:</span>
            <span className="font-mono text-xs">{code.usedByIp}</span>
          </div>
        )}
        {isUsed && code.usedAt && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Used on:</span>
            <span className="text-xs">
              {new Date(code.usedAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant={copiedCode ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={handleCopyCode}
        >
          {copiedCode ? (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Code
            </>
          )}
        </Button>
        <Button
          variant={copiedLink ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={handleCopyLink}
        >
          {copiedLink ? (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
