'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { DashboardHeader } from '@/components/dashboard-header'
import { SortableImageGrid, ImageItem } from '@/components/sortable-image-grid'
import { catalogApi } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { uploadMultipleImages, validateMultipleFiles } from '@/lib/storage'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'

export default function CatalogDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const catalogId = params.id as string
  
  // Add Item state
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [addImages, setAddImages] = useState<ImageItem[]>([])
  const [uploading, setUploading] = useState(false)
  const addFileInputRef = useRef<HTMLInputElement>(null)
  
  // Edit Item state
  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editImages, setEditImages] = useState<ImageItem[]>([])
  const [editUploading, setEditUploading] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  
  // Initial state for change detection
  const [initialEditState, setInitialEditState] = useState<{
    name: string
    price: string
    imageIds: string[]
  } | null>(null)
  
  // Delete Item state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<any>(null)

  // Check if add form has content (for create button)
  const hasAddContent = useMemo(() => {
    return name.trim() !== '' || price !== '' || addImages.length > 0
  }, [name, price, addImages])

  // Check if edit form has changes
  const hasEditChanges = useMemo(() => {
    if (!initialEditState) return false
    
    // Check name change
    if (editName !== initialEditState.name) return true
    
    // Check price change
    if (editPrice !== initialEditState.price) return true
    
    // Check images change (count, order, or new images)
    const currentImageIds = editImages.map(img => img.id).join(',')
    const initialImageIds = initialEditState.imageIds.join(',')
    if (currentImageIds !== initialImageIds) return true
    
    // Check if any new images were added
    if (editImages.some(img => img.isNew)) return true
    
    return false
  }, [editName, editPrice, editImages, initialEditState])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: catalogs } = useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => {
      const { data, error } = await catalogApi.getMy()
      if (error) throw new Error(error.detail)
      return data
    },
  })

  const catalog = Array.isArray(catalogs) ? catalogs.find((c: any) => c.id === catalogId) : undefined

  const addItemMutation = useMutation({
    mutationFn: async (itemData: { name: string; images?: string[]; price?: number }) => {
      const { data, error } = await catalogApi.addItem(catalogId, itemData)
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      handleCloseAdd()
      toast.success('Item added successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, itemData }: { itemId: string; itemData: { name?: string; images?: string[]; price?: number } }) => {
      const { data, error } = await catalogApi.updateItem(catalogId, itemId, itemData)
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      handleCloseEdit()
      toast.success('Item updated successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await catalogApi.deleteItem(catalogId, itemId)
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Item deleted successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Add files to the add images grid
  const handleAddFiles = (files: File[]) => {
    // Validate file sizes
    const validation = validateMultipleFiles(files)
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error))
      // Reset file input
      if (addFileInputRef.current) {
        addFileInputRef.current.value = ''
      }
      return
    }

    const startOrder = addImages.length
    const newImages: ImageItem[] = files.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      url: URL.createObjectURL(file),
      order: startOrder + idx,
      isNew: true,
      file,
    }))
    setAddImages(prev => [...prev, ...newImages])
    // Reset file input
    if (addFileInputRef.current) {
      addFileInputRef.current.value = ''
    }
  }

  // Add files to the edit images grid
  const handleEditAddFiles = (files: File[]) => {
    // Validate file sizes
    const validation = validateMultipleFiles(files)
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error))
      // Reset file input
      if (editFileInputRef.current) {
        editFileInputRef.current.value = ''
      }
      return
    }

    const startOrder = editImages.length
    const newImages: ImageItem[] = files.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      url: URL.createObjectURL(file),
      order: startOrder + idx,
      isNew: true,
      file,
    }))
    setEditImages(prev => [...prev, ...newImages])
    // Reset file input
    if (editFileInputRef.current) {
      editFileInputRef.current.value = ''
    }
  }

  // Remove image from add grid
  const handleRemoveAddImage = (id: string) => {
    setAddImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove?.isNew && imageToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url)
      }
      return prev.filter(img => img.id !== id).map((img, idx) => ({
        ...img,
        order: idx,
      }))
    })
  }

  // Remove image from edit grid
  const handleRemoveEditImage = (id: string) => {
    setEditImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove?.isNew && imageToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url)
      }
      return prev.filter(img => img.id !== id).map((img, idx) => ({
        ...img,
        order: idx,
      }))
    })
  }

  // Close add sheet and cleanup
  const handleCloseAdd = () => {
    // Cleanup blob URLs
    addImages.forEach(img => {
      if (img.isNew && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url)
      }
    })
    setAddOpen(false)
    setName('')
    setPrice('')
    setAddImages([])
  }

  // Close edit sheet and cleanup
  const handleCloseEdit = () => {
    // Cleanup blob URLs
    editImages.forEach(img => {
      if (img.isNew && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url)
      }
    })
    setEditOpen(false)
    setEditingItem(null)
    setEditName('')
    setEditPrice('')
    setEditImages([])
    setInitialEditState(null)
  }

  const handleAddItem = async () => {
    if (!name) {
      toast.error('Item name is required')
      return
    }

    setUploading(true)
    
    // Get files to upload in order
    const filesToUpload = addImages.filter(img => img.isNew && img.file).map(img => img.file!)
    let imageUrls: string[] = []

    if (filesToUpload.length > 0) {
      const { urls, errors } = await uploadMultipleImages(filesToUpload, catalogId)
      if (errors.length > 0) {
        toast.error(`Failed to upload some images: ${errors[0].message}`)
        console.error('Image upload errors:', errors)
      }
      imageUrls = urls
    }

    addItemMutation.mutate({
      name,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      price: price ? parseFloat(price) : undefined,
    })
    setUploading(false)
  }

  const handleEditItem = async () => {
    if (!editName || !editingItem) {
      toast.error('Item name is required')
      return
    }

    setEditUploading(true)
    
    // Separate existing and new images, maintaining order
    const existingUrls: string[] = []
    const filesToUpload: File[] = []
    const imageOrder: { type: 'existing' | 'new'; index: number }[] = []
    
    editImages.forEach(img => {
      if (img.isNew && img.file) {
        imageOrder.push({ type: 'new', index: filesToUpload.length })
        filesToUpload.push(img.file)
      } else if (!img.isNew) {
        imageOrder.push({ type: 'existing', index: existingUrls.length })
        existingUrls.push(img.url)
      }
    })

    // Upload new images
    let newUrls: string[] = []
    if (filesToUpload.length > 0) {
      const { urls, errors } = await uploadMultipleImages(filesToUpload, catalogId)
      if (errors.length > 0) {
        toast.error(`Failed to upload some images: ${errors[0].message}`)
        console.error('Image upload errors:', errors)
      }
      newUrls = urls
    }

    // Reconstruct final URL array in correct order
    const finalUrls = imageOrder.map(item => {
      if (item.type === 'existing') {
        return existingUrls[item.index]
      } else {
        return newUrls[item.index]
      }
    }).filter(Boolean)

    updateItemMutation.mutate({
      itemId: editingItem.id,
      itemData: {
        name: editName,
        images: finalUrls,
        price: editPrice ? parseFloat(editPrice) : undefined,
      },
    })
    setEditUploading(false)
  }

  const handleOpenEdit = (item: any) => {
    const priceStr = item.price?.toString() || ''
    const imageIds = item.images?.map((img: any) => img.id) || []
    
    setEditingItem(item)
    setEditName(item.name)
    setEditPrice(priceStr)
    setEditImages(item.images?.map((img: any) => ({
      id: img.id,
      url: img.url,
      order: img.order,
      isNew: false,
    })) || [])
    
    // Store initial state for change detection
    setInitialEditState({
      name: item.name,
      price: priceStr,
      imageIds: imageIds,
    })
    
    setEditOpen(true)
  }

  const handleOpenDelete = (item: any) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // Helper to get the first image URL from an item
  const getFirstImageUrl = (item: any): string | null => {
    if (item.images && item.images.length > 0) {
      return item.images[0].url
    }
    return null
  }

  if (!catalog) {
    return (
      <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full h-32 md:h-56" />
                <CardHeader className="space-y-2 p-3 md:p-6">
                  <Skeleton className="h-4 md:h-6 w-3/4" />
                  <Skeleton className="h-3 md:h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardHeader
          title={catalog.title}
          description={catalog.description}
          backButton={{
            href: "/dashboard/catalogs",
            label: "Back"
          }}
        />

        {/* Add Item Sheet */}
        <Sheet open={addOpen} onOpenChange={(open) => {
          if (!open) handleCloseAdd()
          else setAddOpen(true)
        }}>
          <SheetTrigger asChild>
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Item
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add Item</SheetTitle>
              <SheetDescription>Add a new item to this catalog</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="item-name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Item Name
                </label>
                <Input
                  id="item-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Item name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name && !uploading && !addItemMutation.isPending) {
                      handleAddItem()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="item-price" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Price (optional)
                </label>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name && !uploading && !addItemMutation.isPending) {
                      handleAddItem()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="item-images" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Images (optional)
                </label>
                <Input
                  id="item-images"
                  ref={addFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 0) {
                      handleAddFiles(files)
                    }
                  }}
                />
              </div>
              {addImages.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Images to Upload</label>
                  <SortableImageGrid
                    images={addImages}
                    onReorder={setAddImages}
                    onRemove={handleRemoveAddImage}
                    columns={3}
                  />
                </div>
              )}
            </div>
            <SheetFooter>
              <Button
                variant="outline"
                onClick={handleCloseAdd}
                disabled={uploading || addItemMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={!name || !hasAddContent || uploading || addItemMutation.isPending}
              >
                {uploading || addItemMutation.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Edit Item Sheet */}
        <Sheet open={editOpen} onOpenChange={(open) => {
          if (!open) handleCloseEdit()
          else setEditOpen(true)
        }}>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit Item</SheetTitle>
              <SheetDescription>Update item information and manage images</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-item-name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Item Name
                </label>
                <Input
                  id="edit-item-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Item name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editName && !editUploading && !updateItemMutation.isPending) {
                      handleEditItem()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-item-price" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Price (optional)
                </label>
                <Input
                  id="edit-item-price"
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="0.00"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editName && !editUploading && !updateItemMutation.isPending) {
                      handleEditItem()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-item-images" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Add More Images
                </label>
                <Input
                  id="edit-item-images"
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 0) {
                      handleEditAddFiles(files)
                    }
                  }}
                />
              </div>
              {editImages.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">All Images (drag to reorder)</label>
                  <SortableImageGrid
                    images={editImages}
                    onReorder={setEditImages}
                    onRemove={handleRemoveEditImage}
                    columns={3}
                  />
                </div>
              )}
            </div>
            <SheetFooter>
              <Button
                variant="outline"
                onClick={handleCloseEdit}
                disabled={editUploading || updateItemMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditItem}
                disabled={!editName || !hasEditChanges || editUploading || updateItemMutation.isPending}
              >
                {editUploading || updateItemMutation.isPending ? 'Updating...' : 'Update Item'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) setDeletingItem(null)
          }}
          title={deletingItem?.name || 'Item'}
          onConfirm={() => {
            if (deletingItem) {
              deleteItemMutation.mutate(deletingItem.id)
            }
            setDeleteDialogOpen(false)
            setDeletingItem(null)
          }}
          isLoading={deleteItemMutation.isPending}
        />

        {catalog.items && catalog.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {catalog.items.map((item: any) => {
              const firstImage = getFirstImageUrl(item)
              const imageCount = item.images?.length || 0
              
              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow border-2 group">
                  <Link href={`/dashboard/catalogs/${catalogId}/items/${item.id}`}>
                    {firstImage ? (
                      <div className="relative w-full h-32 md:h-56 bg-muted cursor-pointer">
                        <Image
                          src={firstImage}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                        {imageCount > 1 && (
                          <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-black/70 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                            +{imageCount - 1} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-32 md:h-56 bg-muted flex items-center justify-center cursor-pointer">
                        <svg className="w-8 h-8 md:w-16 md:h-16 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </Link>
                  <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
                    <div className="flex items-start justify-between">
                      <Link href={`/dashboard/catalogs/${catalogId}/items/${item.id}`} className="flex-1 min-w-0 cursor-pointer">
                        <CardTitle className="line-clamp-2 text-sm md:text-base hover:text-primary transition-colors">{item.name}</CardTitle>
                        {item.price && (
                          <p className="text-sm md:text-lg font-medium text-muted-foreground mt-1 md:mt-2">₱{formatPrice(item.price)}</p>
                        )}
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 md:h-8 md:w-8 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <svg className="h-3 w-3 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/catalogs/${catalogId}/items/${item.id}`}>
                              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={(e) => {
                              e.preventDefault()
                              handleOpenDelete(item)
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
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="border-2">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-muted-foreground text-lg mb-4">No items yet. Add your first item!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
