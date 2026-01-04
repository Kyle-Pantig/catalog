'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
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
import { uploadMultipleImages, validateMultipleFiles } from '@/lib/storage'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

export default function CatalogDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const catalogId = params.id as string
  
  // Add Item state
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [addImages, setAddImages] = useState<ImageItem[]>([])
  const [specifications, setSpecifications] = useState<{ label: string; value: string }[]>([])
  const [variants, setVariants] = useState<{ name: string; options: { value: string; specifications: { label: string; value: string }[] }[] }[]>([])
  const [uploading, setUploading] = useState(false)
  const addFileInputRef = useRef<HTMLInputElement>(null)
  
  // Edit Item state
  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImages, setEditImages] = useState<ImageItem[]>([])
  const [editSpecifications, setEditSpecifications] = useState<{ label: string; value: string }[]>([])
  const [editVariants, setEditVariants] = useState<{ name: string; options: { value: string; specifications: { label: string; value: string }[] }[] }[]>([])
  const [editUploading, setEditUploading] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const isUpdatingRef = useRef(false)
  
  // Initial state for change detection
  const [initialEditState, setInitialEditState] = useState<{
    name: string
    description: string
    imageIds: string[]
    specifications: string
    variants: string
  } | null>(null)
  
  // Delete Item state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<any>(null)

  // Check if add form has content (for create button)
  const hasAddContent = useMemo(() => {
    return name.trim() !== '' || description.trim() !== '' || addImages.length > 0 || specifications.some(s => s.label.trim() || s.value.trim()) || variants.some(v => v.name.trim() || v.options.some(o => o.value.trim()))
  }, [name, description, addImages, specifications, variants])

  // Check if edit form has changes
  const hasEditChanges = useMemo(() => {
    if (!initialEditState) return false
    
    // Check name change
    if (editName !== initialEditState.name) return true
    
    // Check description change
    if (editDescription !== initialEditState.description) return true
    
    // Check specifications change
    const currentSpecs = JSON.stringify(editSpecifications.filter(s => s.label.trim() || s.value.trim()))
    if (currentSpecs !== initialEditState.specifications) return true
    
    // Check variants change
    const currentVariants = JSON.stringify(editVariants.filter(v => v.name.trim() && v.options.some(o => o.value.trim())))
    if (currentVariants !== initialEditState.variants) return true
    
    // Check images change (count, order, or new images)
    const currentImageIds = editImages.map(img => img.id).join(',')
    const initialImageIds = initialEditState.imageIds.join(',')
    if (currentImageIds !== initialImageIds) return true
    
    // Check if any new images were added
    if (editImages.some(img => img.isNew)) return true
    
    return false
  }, [editName, editDescription, editImages, editSpecifications, editVariants, initialEditState])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkAuth()
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
    mutationFn: async (itemData: { name: string; description?: string; images?: string[]; specifications?: { label: string; value: string }[]; variants?: { name: string; options: { value: string; specifications?: { label: string; value: string }[] }[] }[] }) => {
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
    mutationFn: async ({ itemId, itemData }: { itemId: string; itemData: { name?: string; description?: string; images?: string[]; specifications?: { label: string; value: string }[]; variants?: { name: string; options: { value: string; specifications?: { label: string; value: string }[] }[] }[] } }) => {
      const { data, error } = await catalogApi.updateItem(catalogId, itemId, itemData)
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      isUpdatingRef.current = false
      setEditUploading(false)
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      handleCloseEdit()
      toast.success('Item updated successfully!')
    },
    onError: (error: Error) => {
      isUpdatingRef.current = false
      setEditUploading(false)
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
    setDescription('')
    setAddImages([])
    setSpecifications([])
    setVariants([])
  }

  // Close edit sheet and cleanup
  const handleCloseEdit = () => {
    // Cleanup blob URLs
    editImages.forEach(img => {
      if (img.isNew && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url)
      }
    })
    // Reset update ref
    isUpdatingRef.current = false
    setEditOpen(false)
    setEditingItem(null)
    setEditName('')
    setEditDescription('')
    setEditImages([])
    setEditSpecifications([])
    setEditVariants([])
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

    // Filter out empty specifications
    const validSpecs = specifications.filter(s => s.label.trim() && s.value.trim())
    
    // Filter out empty variants and their options
    const validVariants = variants
      .map(v => ({
        name: v.name.trim(),
        options: v.options
          .filter(o => o.value.trim())
          .map(o => ({
            value: o.value.trim(),
            specifications: o.specifications?.filter(s => s.label.trim() && s.value.trim())
          }))
      }))
      .filter(v => v.name && v.options.length > 0)
    
    addItemMutation.mutate({
      name,
      description: description.trim() || undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      specifications: validSpecs.length > 0 ? validSpecs : undefined,
      variants: validVariants.length > 0 ? validVariants : undefined,
    })
    setUploading(false)
  }

  const handleEditItem = useCallback(async () => {
    if (!editName || !editingItem) {
      toast.error('Item name is required')
      return
    }

    // Prevent multiple calls - check all conditions first
    if (isUpdatingRef.current || editUploading || updateItemMutation.isPending) {
      return
    }

    // Set ref immediately to prevent concurrent calls
    isUpdatingRef.current = true
    setEditUploading(true)
    
    try {
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

      // Filter out empty specifications
      const validSpecs = editSpecifications.filter(s => s.label.trim() && s.value.trim())
      
      // Filter out empty variants and their options
      const validVariants = editVariants
        .map(v => ({
          name: v.name.trim(),
          options: v.options
            .filter(o => o.value.trim())
            .map(o => ({
              value: o.value.trim(),
              specifications: o.specifications?.filter(s => s.label.trim() && s.value.trim())
            }))
        }))
        .filter(v => v.name && v.options.length > 0)
      
      updateItemMutation.mutate({
        itemId: editingItem.id,
        itemData: {
          name: editName,
          description: editDescription.trim() || undefined,
          images: finalUrls,
          specifications: validSpecs,
          variants: validVariants,
        },
      })
    } catch (error) {
      isUpdatingRef.current = false
      setEditUploading(false)
    }
  }, [editName, editingItem, editImages, editDescription, editSpecifications, editVariants, catalogId, editUploading, updateItemMutation])

  const handleOpenEdit = (item: any) => {
    const imageIds = item.images?.map((img: any) => img.id) || []
    const specs = item.specifications || []
    const vars = item.variants || []
    
    // Convert old format variants (string options) to new format (object options with specs)
    const convertedVars = vars.map((v: any) => ({
      name: v.name,
      options: v.options?.map((o: any) => 
        typeof o === 'string' 
          ? { value: o, specifications: [] }
          : { value: o.value || '', specifications: o.specifications || [] }
      ) || []
    }))
    
    setEditingItem(item)
    setEditName(item.name)
    setEditDescription(item.description || '')
    setEditImages(item.images?.map((img: any) => ({
      id: img.id,
      url: img.url,
      order: img.order,
      isNew: false,
    })) || [])
    setEditSpecifications(specs.length > 0 ? specs : [])
    setEditVariants(convertedVars.length > 0 ? convertedVars : [])
    
    // Store initial state for change detection
    setInitialEditState({
      name: item.name,
      description: item.description || '',
      imageIds: imageIds,
      specifications: JSON.stringify(specs),
      variants: JSON.stringify(vars),
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

        {/* Add Item Button - Right aligned */}
        <div className="flex justify-end">
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
            <SheetContent side="right" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Add Item</SheetTitle>
                <SheetDescription>Add a new item to this catalog</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-4 py-4">
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
                  <label htmlFor="item-description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Description (optional)
                  </label>
                  <textarea
                    id="item-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Item description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                {/* Hide specifications when variants are added - each variant option has its own specs */}
                {variants.length === 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Specifications (optional)
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSpecifications([...specifications, { label: '', value: '' }])}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Spec
                      </Button>
                    </div>
                    {specifications.map((spec, index) => (
                      <div key={index} className="flex rounded-md border border-input overflow-hidden">
                        <Input
                          value={spec.label}
                          onChange={(e) => {
                            const newSpecs = [...specifications]
                            newSpecs[index].label = e.target.value
                            setSpecifications(newSpecs)
                          }}
                          placeholder="Label"
                          className="flex-1 border-0 rounded-none focus-visible:ring-0"
                        />
                        <div className="w-px bg-input" />
                        <Input
                          value={spec.value}
                          onChange={(e) => {
                            const newSpecs = [...specifications]
                            newSpecs[index].value = e.target.value
                            setSpecifications(newSpecs)
                          }}
                          placeholder="Value"
                          className="flex-1 border-0 rounded-none focus-visible:ring-0"
                        />
                        <div className="w-px bg-input self-stretch" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-none flex-shrink-0 hover:bg-destructive/10"
                          onClick={() => setSpecifications(specifications.filter((_, i) => i !== index))}
                        >
                          <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Hide variants when specifications are added - single product with no variants */}
                {specifications.length === 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Variants (optional)
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setVariants([...variants, { name: '', options: [{ value: '', specifications: [] }] }])}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Variant
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Add product variants like Size, Color, or Material with multiple options.</p>
                  {variants.map((variant, vIndex) => (
                    <div key={vIndex} className="border rounded-lg p-3 space-y-2">
                      <div className="flex rounded-md border border-input overflow-hidden">
                        <Input
                          value={variant.name}
                          onChange={(e) => {
                            const newVariants = [...variants]
                            newVariants[vIndex].name = e.target.value
                            setVariants(newVariants)
                          }}
                          placeholder="Variant name (e.g. Size, Color)"
                          className="flex-1 border-0 rounded-none focus-visible:ring-0"
                        />
                        <div className="w-px bg-input self-stretch" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-none flex-shrink-0 hover:bg-destructive/10"
                          onClick={() => setVariants(variants.filter((_, i) => i !== vIndex))}
                        >
                          <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Options (each option can have its own specifications)</label>
                        {variant.options.map((option, oIndex) => (
                          <div key={oIndex} className="border rounded-md p-2 space-y-2 bg-muted/30">
                            <div className="flex rounded-md border border-input overflow-hidden">
                              <Input
                                value={option.value}
                                onChange={(e) => {
                                  const newVariants = [...variants]
                                  newVariants[vIndex].options[oIndex].value = e.target.value
                                  setVariants(newVariants)
                                }}
                                placeholder={`Option ${oIndex + 1} (e.g. Small, Red)`}
                                className="flex-1 border-0 rounded-none focus-visible:ring-0"
                              />
                              <div className="w-px bg-input self-stretch" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="rounded-none flex-shrink-0 hover:bg-muted"
                                onClick={() => {
                                  const newVariants = [...variants]
                                  newVariants[vIndex].options = newVariants[vIndex].options.filter((_, i) => i !== oIndex)
                                  setVariants(newVariants)
                                }}
                                disabled={variant.options.length <= 1}
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </Button>
                            </div>
                            {/* Specifications for this option */}
                            <div className="pl-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Specs for {option.value || `Option ${oIndex + 1}`}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => {
                                    const newVariants = [...variants]
                                    newVariants[vIndex].options[oIndex].specifications = [
                                      ...newVariants[vIndex].options[oIndex].specifications,
                                      { label: '', value: '' }
                                    ]
                                    setVariants(newVariants)
                                  }}
                                >
                                  + Add Spec
                                </Button>
                              </div>
                              {option.specifications.map((spec, sIndex) => (
                                <div key={sIndex} className="flex rounded-md border border-input overflow-hidden">
                                  <Input
                                    value={spec.label}
                                    onChange={(e) => {
                                      const newVariants = [...variants]
                                      newVariants[vIndex].options[oIndex].specifications[sIndex].label = e.target.value
                                      setVariants(newVariants)
                                    }}
                                    placeholder="Label"
                                    className="flex-1 h-8 text-xs border-0 rounded-none focus-visible:ring-0"
                                  />
                                  <div className="w-px bg-input" />
                                  <Input
                                    value={spec.value}
                                    onChange={(e) => {
                                      const newVariants = [...variants]
                                      newVariants[vIndex].options[oIndex].specifications[sIndex].value = e.target.value
                                      setVariants(newVariants)
                                    }}
                                    placeholder="Value"
                                    className="flex-1 h-8 text-xs border-0 rounded-none focus-visible:ring-0"
                                  />
                                  <div className="w-px bg-input self-stretch" />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-none flex-shrink-0 hover:bg-destructive/10"
                                    onClick={() => {
                                      const newVariants = [...variants]
                                      newVariants[vIndex].options[oIndex].specifications = 
                                        newVariants[vIndex].options[oIndex].specifications.filter((_, i) => i !== sIndex)
                                      setVariants(newVariants)
                                    }}
                                  >
                                    <svg className="w-3 h-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const newVariants = [...variants]
                            newVariants[vIndex].options.push({ value: '', specifications: [] })
                            setVariants(newVariants)
                          }}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Option
                        </Button>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
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
              <SheetFooter className="border-t pt-4 mt-4">
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
        </div>

        {/* Edit Item Sheet */}
        <Sheet open={editOpen} onOpenChange={(open) => {
          if (!open) handleCloseEdit()
          else setEditOpen(true)
        }}>
          <SheetContent side="right" className="flex flex-col">
            <SheetHeader>
              <SheetTitle>Edit Item</SheetTitle>
              <SheetDescription>Update item information and manage images</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
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
                    if (e.key === 'Enter' && editName && !editUploading && !updateItemMutation.isPending && !isUpdatingRef.current) {
                      e.preventDefault()
                      handleEditItem()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-item-description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Description (optional)
                </label>
                <textarea
                  id="edit-item-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Item description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {/* Hide specifications when variants are added - each variant option has its own specs */}
              {editVariants.length === 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Specifications (optional)
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditSpecifications([...editSpecifications, { label: '', value: '' }])}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Spec
                    </Button>
                  </div>
                  {editSpecifications.map((spec, index) => (
                    <div key={index} className="flex rounded-md border border-input overflow-hidden">
                      <Input
                        value={spec.label}
                        onChange={(e) => {
                          const newSpecs = [...editSpecifications]
                          newSpecs[index].label = e.target.value
                          setEditSpecifications(newSpecs)
                        }}
                        placeholder="Label"
                        className="flex-1 border-0 rounded-none focus-visible:ring-0"
                      />
                      <div className="w-px bg-input" />
                      <Input
                        value={spec.value}
                        onChange={(e) => {
                          const newSpecs = [...editSpecifications]
                          newSpecs[index].value = e.target.value
                          setEditSpecifications(newSpecs)
                        }}
                        placeholder="Value"
                        className="flex-1 border-0 rounded-none focus-visible:ring-0"
                      />
                      <div className="w-px bg-input self-stretch" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-none flex-shrink-0 hover:bg-destructive/10"
                        onClick={() => setEditSpecifications(editSpecifications.filter((_, i) => i !== index))}
                      >
                        <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {/* Hide variants when specifications are added - single product with no variants */}
              {editSpecifications.length === 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Variants (optional)
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditVariants([...editVariants, { name: '', options: [{ value: '', specifications: [] }] }])}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Variant
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Add product variants like Size, Color, or Material with multiple options.</p>
                {editVariants.map((variant, vIndex) => (
                  <div key={vIndex} className="border rounded-lg p-3 space-y-2">
                    <div className="flex rounded-md border border-input overflow-hidden">
                      <Input
                        value={variant.name}
                        onChange={(e) => {
                          const newVariants = [...editVariants]
                          newVariants[vIndex].name = e.target.value
                          setEditVariants(newVariants)
                        }}
                        placeholder="Variant name (e.g. Size, Color)"
                        className="flex-1 border-0 rounded-none focus-visible:ring-0"
                      />
                      <div className="w-px bg-input self-stretch" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-none flex-shrink-0 hover:bg-destructive/10"
                        onClick={() => setEditVariants(editVariants.filter((_, i) => i !== vIndex))}
                      >
                        <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Options (each option can have its own specifications)</label>
                      {variant.options.map((option, oIndex) => (
                        <div key={oIndex} className="border rounded-md p-2 space-y-2 bg-muted/30">
                          <div className="flex rounded-md border border-input overflow-hidden">
                            <Input
                              value={option.value}
                              onChange={(e) => {
                                const newVariants = [...editVariants]
                                newVariants[vIndex].options[oIndex].value = e.target.value
                                setEditVariants(newVariants)
                              }}
                              placeholder={`Option ${oIndex + 1} (e.g. Small, Red)`}
                              className="flex-1 border-0 rounded-none focus-visible:ring-0"
                            />
                            <div className="w-px bg-input self-stretch" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="rounded-none flex-shrink-0 hover:bg-muted"
                              onClick={() => {
                                const newVariants = [...editVariants]
                                newVariants[vIndex].options = newVariants[vIndex].options.filter((_, i) => i !== oIndex)
                                setEditVariants(newVariants)
                              }}
                              disabled={variant.options.length <= 1}
                            >
                              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </Button>
                          </div>
                          {/* Specifications for this option */}
                          <div className="pl-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Specs for {option.value || `Option ${oIndex + 1}`}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => {
                                  const newVariants = [...editVariants]
                                  newVariants[vIndex].options[oIndex].specifications = [
                                    ...newVariants[vIndex].options[oIndex].specifications,
                                    { label: '', value: '' }
                                  ]
                                  setEditVariants(newVariants)
                                }}
                              >
                                + Add Spec
                              </Button>
                            </div>
                            {option.specifications.map((spec, sIndex) => (
                              <div key={sIndex} className="flex rounded-md border border-input overflow-hidden">
                                <Input
                                  value={spec.label}
                                  onChange={(e) => {
                                    const newVariants = [...editVariants]
                                    newVariants[vIndex].options[oIndex].specifications[sIndex].label = e.target.value
                                    setEditVariants(newVariants)
                                  }}
                                  placeholder="Label"
                                  className="flex-1 h-8 text-xs border-0 rounded-none focus-visible:ring-0"
                                />
                                <div className="w-px bg-input" />
                                <Input
                                  value={spec.value}
                                  onChange={(e) => {
                                    const newVariants = [...editVariants]
                                    newVariants[vIndex].options[oIndex].specifications[sIndex].value = e.target.value
                                    setEditVariants(newVariants)
                                  }}
                                  placeholder="Value"
                                  className="flex-1 h-8 text-xs border-0 rounded-none focus-visible:ring-0"
                                />
                                <div className="w-px bg-input self-stretch" />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-none flex-shrink-0 hover:bg-destructive/10"
                                  onClick={() => {
                                    const newVariants = [...editVariants]
                                    newVariants[vIndex].options[oIndex].specifications = 
                                      newVariants[vIndex].options[oIndex].specifications.filter((_, i) => i !== sIndex)
                                    setEditVariants(newVariants)
                                  }}
                                >
                                  <svg className="w-3 h-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const newVariants = [...editVariants]
                          newVariants[vIndex].options.push({ value: '', specifications: [] })
                          setEditVariants(newVariants)
                        }}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Option
                      </Button>
                    </div>
                  </div>
                ))}
                </div>
              )}
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
            <SheetFooter className="border-t pt-4 mt-4">
              <Button
                variant="outline"
                onClick={handleCloseEdit}
                disabled={editUploading || updateItemMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEditItem()
                }}
                disabled={!editName || !hasEditChanges || editUploading || updateItemMutation.isPending || isUpdatingRef.current}
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
