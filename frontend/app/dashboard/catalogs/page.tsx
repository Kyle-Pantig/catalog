'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Toggle } from '@/components/ui/toggle'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { DashboardHeader } from '@/components/dashboard-header'
import Image from 'next/image'
import { catalogApi } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/storage'

type ViewMode = 'list' | 'board'

export default function CatalogsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editOpen, setEditOpen] = useState(false)
  const [editingCatalog, setEditingCatalog] = useState<any>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCoverPhotoFile, setEditCoverPhotoFile] = useState<File | null>(null)
  const [editCoverPhotoPreview, setEditCoverPhotoPreview] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCatalog, setDeletingCatalog] = useState<any>(null)
  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
      router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  const { data: catalogs, isLoading } = useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => {
      const { data, error } = await catalogApi.getMy()
      if (error) throw new Error(error.detail)
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      let coverPhotoUrl: string | undefined = undefined
      
      // Upload cover photo if provided
      if (coverPhotoFile) {
        setUploadingCoverPhoto(true)
        // We need a temporary catalog ID, but we can't get it until after creation
        // So we'll create the catalog first, then update it with the cover photo
        const { data: catalogData, error } = await catalogApi.create(title, description)
        if (error) throw new Error(error.detail)
        if (!catalogData || typeof catalogData !== 'object' || !('id' in catalogData)) {
          throw new Error('Failed to create catalog')
        }
        const catalogId = (catalogData as { id: string }).id
        
        // Upload cover photo
        const { url, error: uploadError } = await uploadImage(coverPhotoFile, catalogId)
        if (uploadError) {
          // Catalog was created but cover photo upload failed
          console.error('Cover photo upload failed:', uploadError)
          toast.warning('Catalog created but cover photo upload failed')
        } else if (url) {
          // Update catalog with cover photo URL
          const { error: updateError } = await catalogApi.update(catalogId, { coverPhoto: url })
          if (updateError) {
            console.error('Failed to update catalog with cover photo:', updateError)
          }
        }
        setUploadingCoverPhoto(false)
        return catalogData
      } else {
      const { data, error } = await catalogApi.create(title, description)
      if (error) throw new Error(error.detail)
      return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      setOpen(false)
      setTitle('')
      setDescription('')
      setCoverPhotoFile(null)
      if (coverPhotoPreview) {
        URL.revokeObjectURL(coverPhotoPreview)
        setCoverPhotoPreview(null)
      }
      toast.success('Catalog created successfully!')
    },
    onError: (error: Error) => {
      setUploadingCoverPhoto(false)
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, description, coverPhoto }: { id: string; title?: string; description?: string; coverPhoto?: string }) => {
      const { data, error } = await catalogApi.update(id, { title, description, coverPhoto })
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      setEditOpen(false)
      setEditingCatalog(null)
      setEditTitle('')
      setEditDescription('')
      setEditCoverPhotoFile(null)
      if (editCoverPhotoPreview) {
        URL.revokeObjectURL(editCoverPhotoPreview)
        setEditCoverPhotoPreview(null)
      }
      toast.success('Catalog updated successfully!')
    },
    onError: (error: Error) => {
      setUploadingCoverPhoto(false)
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await catalogApi.delete(id)
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      setDeleteDialogOpen(false)
      setDeletingCatalog(null)
      toast.success('Catalog deleted successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleEdit = (catalog: any) => {
    setEditingCatalog(catalog)
    setEditTitle(catalog.title)
    setEditDescription(catalog.description || '')
    setEditCoverPhotoPreview(catalog.coverPhoto || null)
    setEditCoverPhotoFile(null)
    setEditOpen(true)
  }

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Create preview
    const preview = URL.createObjectURL(file)
    if (isEdit) {
      setEditCoverPhotoFile(file)
      if (editCoverPhotoPreview && !editCoverPhotoPreview.startsWith('http')) {
        URL.revokeObjectURL(editCoverPhotoPreview)
      }
      setEditCoverPhotoPreview(preview)
    } else {
      setCoverPhotoFile(file)
      if (coverPhotoPreview) {
        URL.revokeObjectURL(coverPhotoPreview)
      }
      setCoverPhotoPreview(preview)
    }
  }

  const handleRemoveCoverPhoto = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditCoverPhotoFile(null)
      if (editCoverPhotoPreview) {
        if (!editCoverPhotoPreview.startsWith('http')) {
          URL.revokeObjectURL(editCoverPhotoPreview)
        }
        setEditCoverPhotoPreview(null)
      }
    } else {
      setCoverPhotoFile(null)
      if (coverPhotoPreview) {
        URL.revokeObjectURL(coverPhotoPreview)
        setCoverPhotoPreview(null)
      }
    }
  }

  const handleUpdateCatalog = async () => {
    if (!editingCatalog) return

    let coverPhotoUrl: string | undefined = editingCatalog.coverPhoto

    // Upload new cover photo if provided
    if (editCoverPhotoFile) {
      setUploadingCoverPhoto(true)
      const { url, error: uploadError } = await uploadImage(editCoverPhotoFile, editingCatalog.id)
      if (uploadError) {
        toast.error('Failed to upload cover photo')
        setUploadingCoverPhoto(false)
        return
      }
      if (url) {
        coverPhotoUrl = url
      }
      setUploadingCoverPhoto(false)
    } else if (editCoverPhotoPreview === null && editingCatalog.coverPhoto) {
      // Cover photo was removed
      coverPhotoUrl = ''
    }

    updateMutation.mutate({ 
      id: editingCatalog.id, 
      title: editTitle, 
      description: editDescription,
      coverPhoto: coverPhotoUrl
    })
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardHeader
          title="My Catalogs"
          description="Create and manage your product catalogs"
          backButton={{
            href: "/dashboard",
            label: "Dashboard"
          }}
        />

        {/* Controls above table/card list */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          {/* Desktop View Toggle */}
          <div className="hidden md:flex items-center gap-2 border rounded-md p-1 bg-muted/50">
            <Toggle
              pressed={viewMode === 'list'}
              onPressedChange={() => setViewMode('list')}
              aria-label="List view"
              size="sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Toggle>
            <Toggle
              pressed={viewMode === 'board'}
              onPressedChange={() => setViewMode('board')}
              aria-label="Board view"
              size="sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </Toggle>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button className="w-full sm:w-auto">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Catalog
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Create Catalog</SheetTitle>
                <SheetDescription>Add a new product catalog</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="catalog-title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Title
                  </label>
                  <Input
                    id="catalog-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Catalog title"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && title && !createMutation.isPending) {
                        createMutation.mutate()
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="catalog-description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Description
                  </label>
                  <Input
                    id="catalog-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Catalog description"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && title && !createMutation.isPending) {
                        createMutation.mutate()
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="catalog-cover-photo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Cover Photo
                  </label>
                  {coverPhotoPreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border-2">
                      <Image
                        src={coverPhotoPreview}
                        alt="Cover preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleRemoveCoverPhoto(false)}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <input
                        id="catalog-cover-photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCoverPhotoChange(e, false)}
                        className="hidden"
                      />
                      <label
                        htmlFor="catalog-cover-photo"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-muted-foreground">Click to upload cover photo</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <SheetFooter className="border-t pt-4 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false)
                    setTitle('')
                    setDescription('')
                    setCoverPhotoFile(null)
                    if (coverPhotoPreview) {
                      URL.revokeObjectURL(coverPhotoPreview)
                      setCoverPhotoPreview(null)
                    }
                  }}
                  disabled={createMutation.isPending || uploadingCoverPhoto}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!title || createMutation.isPending || uploadingCoverPhoto}
                >
                  {createMutation.isPending || uploadingCoverPhoto ? 'Creating...' : 'Create'}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Edit Catalog Sheet */}
          <Sheet open={editOpen} onOpenChange={setEditOpen}>
            <SheetContent side="right" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Edit Catalog</SheetTitle>
                <SheetDescription>Update your catalog information</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="edit-catalog-title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Title
                  </label>
                  <Input
                    id="edit-catalog-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Catalog title"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editTitle && !updateMutation.isPending) {
                        handleUpdateCatalog()
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-catalog-description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Description
                  </label>
                  <Input
                    id="edit-catalog-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Catalog description"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editTitle && !updateMutation.isPending) {
                        handleUpdateCatalog()
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-catalog-cover-photo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Cover Photo
                  </label>
                  {editCoverPhotoPreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border-2">
                      <Image
                        src={editCoverPhotoPreview}
                        alt="Cover preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleRemoveCoverPhoto(true)}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <input
                        id="edit-catalog-cover-photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCoverPhotoChange(e, true)}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-catalog-cover-photo"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-muted-foreground">Click to upload cover photo</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <SheetFooter className="border-t pt-4 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false)
                    setEditingCatalog(null)
                    setEditTitle('')
                    setEditDescription('')
                    setEditCoverPhotoFile(null)
                    if (editCoverPhotoPreview && !editCoverPhotoPreview.startsWith('http')) {
                      URL.revokeObjectURL(editCoverPhotoPreview)
                    }
                    setEditCoverPhotoPreview(null)
                  }}
                  disabled={updateMutation.isPending || uploadingCoverPhoto}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateCatalog}
                  disabled={
                    !editTitle || 
                    updateMutation.isPending || 
                    uploadingCoverPhoto ||
                    (editTitle === editingCatalog?.title && 
                     editDescription === (editingCatalog?.description || '') &&
                     !editCoverPhotoFile &&
                     editCoverPhotoPreview === (editingCatalog?.coverPhoto || null))
                  }
                >
                  {updateMutation.isPending || uploadingCoverPhoto ? 'Updating...' : 'Update'}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {isLoading ? (
          <>
            {/* Mobile Skeleton */}
            <div className="md:hidden space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-9 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Desktop Skeleton - List */}
            {viewMode === 'list' && (
              <Card className="hidden md:block">
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="grid grid-cols-6 gap-4 pb-3 border-b">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="grid grid-cols-6 gap-4 py-3 border-b last:border-0">
                        <Skeleton className="h-12 w-16" />
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            {/* Desktop Skeleton - Board */}
            {viewMode === 'board' && (
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-9 w-full mt-4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : catalogs && Array.isArray(catalogs) && catalogs.length > 0 ? (
          <>
            {/* Mobile View - Cards */}
            <div className="md:hidden space-y-4">
              {catalogs.map((catalog: any) => (
                <Card key={catalog.id} className="border-2 hover:shadow-lg transition-shadow overflow-hidden">
                  {catalog.coverPhoto ? (
                    <div className="relative w-full h-32">
                      <Image
                        src={catalog.coverPhoto}
                        alt={catalog.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
                    </div>
                  ) : (
                    <div className="relative w-full h-32 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <svg className="w-12 h-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <CardHeader className={`relative ${catalog.coverPhoto ? 'pt-4' : ''}`}>
                    <div className="absolute top-4 right-4 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/catalogs/${catalog.id}`}>
                              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add Item
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(catalog)}>
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={(e) => {
                              e.preventDefault()
                                setDeletingCatalog(catalog)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-xl pr-10">{catalog.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {catalog.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <ItemsPopover items={catalog.items || []} catalogId={catalog.id}>
                        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <span>{catalog.items?.length || 0} {catalog.items?.length === 1 ? 'item' : 'items'}</span>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </ItemsPopover>
                      <div className="text-muted-foreground">
                        {new Date(catalog.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop View - List (Table) */}
            {viewMode === 'list' && (
              <Card className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Cover</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalogs.map((catalog: any) => (
                      <TableRow key={catalog.id}>
                        <TableCell>
                          {catalog.coverPhoto ? (
                            <div className="relative w-16 h-12 rounded-md overflow-hidden border">
                              <Image
                                src={catalog.coverPhoto}
                                alt={catalog.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-12 rounded-md border bg-muted flex items-center justify-center">
                              <svg className="w-6 h-6 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{catalog.title}</TableCell>
                        <TableCell className="max-w-md">
                          <span className="truncate block">{catalog.description || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <ItemsPopover items={catalog.items || []} catalogId={catalog.id}>
                            <button className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer">
                            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <span className="font-medium">{catalog.items?.length || 0}</span>
                              <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </ItemsPopover>
                        </TableCell>
                        <TableCell>{new Date(catalog.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/catalogs/${catalog.id}`}>
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Item
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(catalog)}>
                              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(e) => {
                                    e.preventDefault()
                                setDeletingCatalog(catalog)
                                setDeleteDialogOpen(true)
                                  }}
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

            {/* Desktop View - Board (Grid) */}
            {viewMode === 'board' && (
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {catalogs.map((catalog: any) => (
                  <Card key={catalog.id} className="border-2 hover:shadow-lg transition-shadow flex flex-col overflow-hidden">
                    {catalog.coverPhoto ? (
                      <div className="relative w-full h-40">
                        <Image
                          src={catalog.coverPhoto}
                          alt={catalog.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
                      </div>
                    ) : (
                      <div className="relative w-full h-40 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <svg className="w-16 h-16 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <CardHeader className={`relative ${catalog.coverPhoto ? 'pt-4' : ''}`}>
                      <div className="absolute top-4 right-4 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/catalogs/${catalog.id}`}>
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Item
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(catalog)}>
                              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(e) => {
                                    e.preventDefault()
                                setDeletingCatalog(catalog)
                                setDeleteDialogOpen(true)
                                  }}
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-xl line-clamp-1 pr-10">{catalog.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {catalog.description || 'No description'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <ItemsPopover items={catalog.items || []} catalogId={catalog.id}>
                          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <span className="font-medium text-foreground">{catalog.items?.length || 0} {catalog.items?.length === 1 ? 'item' : 'items'}</span>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </ItemsPopover>
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(catalog.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <Card className="border-2">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-muted-foreground text-lg mb-4">No catalogs yet. Create your first catalog!</p>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) setDeletingCatalog(null)
          }}
          title={deletingCatalog?.title || 'Catalog'}
          onConfirm={() => {
            if (deletingCatalog) {
              deleteMutation.mutate(deletingCatalog.id)
            }
          }}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  )
}

function ItemsPopover({ items, catalogId, children }: { items: any[]; catalogId: string; children: React.ReactNode }) {
  if (!items || items.length === 0) {
    return <>{children}</>
  }

  const getFirstImageUrl = (item: any) => {
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      return item.images[0].url
    }
    return item.imageUrl || null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <h4 className="font-semibold text-sm">Items ({items.length})</h4>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No items in this catalog
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item: any) => {
                const firstImage = getFirstImageUrl(item)
                return (
                  <Link
                    key={item.id}
                    href={`/dashboard/catalogs/${catalogId}/items/${item.id}`}
                    className="block p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {firstImage ? (
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <Image
                            src={firstImage}
                            alt={item.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

