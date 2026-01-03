'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { SortableImageGrid, ImageItem } from '@/components/sortable-image-grid'
import { catalogApi } from '@/lib/api'
import { uploadMultipleImages, validateMultipleFiles } from '@/lib/storage'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

export default function ItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const catalogId = params.id as string
  const itemId = params.itemId as string

  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [[page, direction], setPage] = useState([0, 0])

  // Variant selection state (for display)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Update URL when variant selection changes
  const updateVariantUrl = useCallback((newSelections: Record<string, string>) => {
    const params = new URLSearchParams()
    Object.entries(newSelections).forEach(([key, value]) => {
      params.set(key, value)
    })
    const queryString = params.toString()
    const newUrl = queryString 
      ? `/dashboard/catalogs/${catalogId}/items/${itemId}?${queryString}`
      : `/dashboard/catalogs/${catalogId}/items/${itemId}`
    router.replace(newUrl, { scroll: false })
  }, [catalogId, itemId, router])

  // Handle variant selection (user interaction)
  const handleVariantSelect = useCallback((variantName: string, optionValue: string) => {
    setIsInitialLoad(false)
    const newSelections = { ...selectedVariants, [variantName]: optionValue }
    setSelectedVariants(newSelections)
    updateVariantUrl(newSelections)
  }, [selectedVariants, updateVariantUrl])

  // Edit Item state
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImages, setEditImages] = useState<ImageItem[]>([])
  const [editSpecifications, setEditSpecifications] = useState<{ label: string; value: string }[]>([])
  const [editVariants, setEditVariants] = useState<{ name: string; options: { value: string; specifications: { label: string; value: string }[] }[] }[]>([])
  const [editUploading, setEditUploading] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Initial state for change detection
  const [initialEditState, setInitialEditState] = useState<{
    name: string
    description: string
    imageIds: string[]
    specifications: string
    variants: string
  } | null>(null)

  // Manage Images state
  const [manageImagesOpen, setManageImagesOpen] = useState(false)
  const [managedImages, setManagedImages] = useState<ImageItem[]>([])
  const [initialImageOrder, setInitialImageOrder] = useState<string[]>([])

  // Delete Item state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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

  // Check if image order has changed
  const hasOrderChanges = useMemo(() => {
    const currentOrder = managedImages.map(img => img.id).join(',')
    const initialOrder = initialImageOrder.join(',')
    return currentOrder !== initialOrder
  }, [managedImages, initialImageOrder])

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

  const catalog = (catalogs as any[])?.find((c: any) => c.id === catalogId)
  const item = catalog?.items?.find((i: any) => i.id === itemId)

  const totalImages = item?.images?.length || 0

  // Auto-select variant options on load (from URL params or default to first)
  useEffect(() => {
    if (item?.variants && item.variants.length > 0 && Object.keys(selectedVariants).length === 0) {
      const defaultSelections: Record<string, string> = {}
      let hasUrlParams = false
      
      item.variants.forEach((variant: { name: string; options: any[] }) => {
        // Check URL params first
        const urlValue = searchParams.get(variant.name)
        if (urlValue) {
          // Validate that the URL value exists in options
          const validOption = variant.options.find((o: any) => 
            (typeof o === 'string' ? o : o.value) === urlValue
          )
          if (validOption) {
            defaultSelections[variant.name] = urlValue
            hasUrlParams = true
            return
          }
        }
        // Fall back to first option
        if (variant.options.length > 0) {
          const firstOption = variant.options[0]
          defaultSelections[variant.name] = typeof firstOption === 'string' ? firstOption : firstOption.value
        }
      })
      setSelectedVariants(defaultSelections)
      
      // Update URL only if no params were in URL (after a small delay to avoid render cycle)
      if (!hasUrlParams && Object.keys(defaultSelections).length > 0) {
        setTimeout(() => {
          updateVariantUrl(defaultSelections)
        }, 0)
      }
    }
  }, [item?.variants, searchParams, updateVariantUrl])

  // Slide variants for animation
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  const paginate = useCallback((newDirection: number) => {
    const newIndex = selectedImageIndex + newDirection
    if (newIndex >= 0 && newIndex < totalImages) {
      setPage([page + newDirection, newDirection])
      setSelectedImageIndex(newIndex)
    }
  }, [selectedImageIndex, totalImages, page])

  const goToPrevImage = useCallback(() => {
    if (selectedImageIndex > 0) {
      paginate(-1)
    }
  }, [selectedImageIndex, paginate])

  const goToNextImage = useCallback(() => {
    if (selectedImageIndex < totalImages - 1) {
      paginate(1)
    }
  }, [selectedImageIndex, totalImages, paginate])

  // Direct image selection (for thumbnails/dots)
  const goToImage = useCallback((index: number) => {
    const newDirection = index > selectedImageIndex ? 1 : -1
    setPage([page + newDirection, newDirection])
    setSelectedImageIndex(index)
  }, [selectedImageIndex, page])

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemData }: { itemData: { name?: string; description?: string; images?: string[]; specifications?: { label: string; value: string }[]; variants?: { name: string; options: { value: string; specifications?: { label: string; value: string }[] }[] }[] } }) => {
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

  const reorderImagesMutation = useMutation({
    mutationFn: async (images: { id: string; order: number }[]) => {
      const { data, error } = await catalogApi.reorderImages(catalogId, itemId, images)
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      setManageImagesOpen(false)
      toast.success('Images reordered successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await catalogApi.deleteItem(catalogId, itemId)
      if (error) throw new Error(error.detail)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Item deleted successfully!')
      router.push(`/dashboard/catalogs/${catalogId}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

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

  // Close edit sheet and cleanup
  const handleCloseEdit = () => {
    // Cleanup blob URLs
    editImages.forEach(img => {
      if (img.isNew && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url)
      }
    })
    setEditOpen(false)
    setEditName('')
    setEditDescription('')
    setEditImages([])
    setEditSpecifications([])
    setEditVariants([])
    setInitialEditState(null)
  }

  const handleEditItem = async () => {
    if (!editName || !item) {
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
      itemData: {
        name: editName,
        description: editDescription.trim() || undefined,
        images: finalUrls,
        specifications: validSpecs,
        variants: validVariants,
      },
    })
    setEditUploading(false)
  }

  const handleOpenEdit = () => {
    if (item) {
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
  }

  const handleOpenManageImages = () => {
    if (item?.images) {
      const imageIds = item.images.map((img: any) => img.id)
      
      setManagedImages(item.images.map((img: any) => ({
        id: img.id,
        url: img.url,
        order: img.order,
        isNew: false,
      })))
      
      // Store initial order for change detection
      setInitialImageOrder(imageIds)
      
      setManageImagesOpen(true)
    }
  }

  const handleSaveImageOrder = () => {
    const imageOrders = managedImages.map(img => ({
      id: img.id,
      order: img.order,
    }))
    reorderImagesMutation.mutate(imageOrders)
  }

  // Get images from item
  const images = item?.images || []
  const hasImages = images.length > 0
  const selectedImage = hasImages ? images[selectedImageIndex] : null

  if (isLoading || !catalog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="p-4 pb-32 md:p-8 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            {/* Breadcrumb Skeleton */}
            <nav className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </nav>

            {/* Main Content Skeleton */}
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
              {/* Image Section Skeleton */}
              <div className="space-y-4">
                <Skeleton className="aspect-square rounded-2xl" />
                {/* Thumbnails Skeleton */}
                <div className="flex gap-2">
                  <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-lg flex-shrink-0" />
                  <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-lg flex-shrink-0" />
                  <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-lg flex-shrink-0" />
                </div>
              </div>

              {/* Details Section Skeleton */}
              <div className="flex flex-col">
                <div className="flex-1 space-y-6">
                  {/* Title Skeleton */}
                  <Skeleton className="h-12 md:h-14 lg:h-16 w-3/4" />
                  
                  {/* Price Skeleton */}
                  <Skeleton className="h-16 md:h-20 lg:h-24 w-48" />

                  {/* Desktop Actions Skeleton - hidden on mobile */}
                  <div className="hidden md:flex flex-col sm:flex-row gap-3 pt-6">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 flex-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Fixed Bottom Action Bar Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 backdrop-blur-sm border-t p-4 space-y-2">
          <Skeleton className="h-11 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto">
          <Card className="border-2">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Item not found</h2>
              <p className="text-muted-foreground mb-6">The item you're looking for doesn't exist or has been deleted.</p>
              <Link href={`/dashboard/catalogs/${catalogId}`}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Catalog
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Sticky Breadcrumb */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <nav className="flex items-center gap-2 text-sm">
              <Link 
                href="/dashboard/catalogs"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Catalogs
              </Link>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <Link 
                href={`/dashboard/catalogs/${catalogId}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {catalog.title}
              </Link>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-foreground font-medium truncate max-w-[200px]">{item.name}</span>
            </nav>
          </div>
        </div>
      </div>

      {/* Main scrollable content */}
      <div className="p-4 pb-32 md:p-8 md:pb-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
            {/* Image Section */}
            <PhotoProvider>
              <div className="space-y-4">
                {/* Main Image with Swipe Support */}
                {hasImages ? (
                  <>
                    {/* Render all PhotoViews in correct order - only selected one is visible */}
                    {images.map((img: any, idx: number) => (
                      <PhotoView key={img.id || idx} src={img.url}>
                        {selectedImageIndex === idx ? (
                          <div 
                            className="relative aspect-square bg-muted rounded-2xl overflow-hidden border shadow-lg select-none cursor-pointer"
                          >
                      <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.div
                          key={selectedImageIndex}
                          custom={direction}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                          }}
                          className="absolute inset-0"
                        >
                          <Image
                            src={selectedImage.url}
                            alt={item.name}
                            fill
                            className="object-cover pointer-events-none"
                            priority
                            draggable={false}
                          />
                        </motion.div>
                      </AnimatePresence>
                  
                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      {/* Left Arrow */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          goToPrevImage()
                        }}
                        disabled={selectedImageIndex === 0}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center transition-opacity ${
                          selectedImageIndex === 0 
                            ? 'opacity-30 cursor-not-allowed' 
                            : 'opacity-70 hover:opacity-100 hover:bg-black/70'
                        }`}
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </motion.button>
                      
                      {/* Right Arrow */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          goToNextImage()
                        }}
                        disabled={selectedImageIndex === images.length - 1}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center transition-opacity ${
                          selectedImageIndex === images.length - 1 
                            ? 'opacity-30 cursor-not-allowed' 
                            : 'opacity-70 hover:opacity-100 hover:bg-black/70'
                        }`}
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.button>
                      
                      {/* Image Counter Badge */}
                      <motion.div 
                        key={selectedImageIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-black/60 text-white text-sm font-medium rounded-full pointer-events-none"
                      >
                        {selectedImageIndex + 1} / {images.length}
                      </motion.div>
                    </>
                  )}
                          </div>
                        ) : (
                          <div style={{ display: 'none' }} />
                        )}
                      </PhotoView>
                    ))}
                  </>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex flex-col items-center justify-center border shadow-lg">
                    <svg className="w-32 h-32 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-muted-foreground/50 mt-4 text-sm">No images available</p>
                  </div>
                )}

                {/* Image Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((img: any, idx: number) => (
                      <button
                        key={img.id || idx}
                        onClick={() => goToImage(idx)}
                        className={`relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedImageIndex === idx 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                      >
                        <Image
                          src={img.url}
                          alt={`${item.name} - ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PhotoProvider>

            {/* Details Section */}
            <div className="flex flex-col">
              <div className="flex-1 space-y-6">
                {/* Title */}
                <div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">{item.name}</h1>
                </div>

                {/* Description */}
                {item.description && (
                  <div className="pt-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                    <p className="text-foreground whitespace-pre-wrap">{item.description}</p>
                  </div>
                )}

                {/* Specifications - for items without variants */}
                {item.specifications && item.specifications.length > 0 && (
                  <div className="pt-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Specifications</h3>
                    <div className="grid gap-2">
                      {item.specifications.map((spec: { label: string; value: string }, index: number) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">{spec.label}</span>
                          <span className="text-sm font-medium">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variants with dynamic specifications */}
                {item.variants && item.variants.length > 0 && (
                  <div className="pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Select Options</h3>
                    <div className="space-y-4">
                      {item.variants.map((variant: { name: string; options: any[] }, index: number) => (
                        <div key={index}>
                          <p className="text-sm font-medium mb-2">
                            {variant.name}
                            {selectedVariants[variant.name] && (
                              <span className="ml-2 text-primary">: {selectedVariants[variant.name]}</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {variant.options.map((option: any, optIndex: number) => {
                              const optionValue = typeof option === 'string' ? option : option.value
                              return (
                                <button
                                  key={optIndex}
                                  onClick={() => handleVariantSelect(variant.name, optionValue)}
                                  className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                                    selectedVariants[variant.name] === optionValue
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-muted hover:bg-muted/80 border-border hover:border-primary/50'
                                  }`}
                                >
                                  {optionValue}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dynamic Specifications based on selected variants */}
                    {(() => {
                      // Collect all specs from selected variant options
                      const allSelectedSpecs: { label: string; value: string }[] = []
                      item.variants.forEach((variant: { name: string; options: any[] }) => {
                        const selectedValue = selectedVariants[variant.name]
                        if (selectedValue) {
                          const selectedOption = variant.options.find((o: any) => 
                            (typeof o === 'string' ? o : o.value) === selectedValue
                          )
                          if (selectedOption && typeof selectedOption === 'object' && selectedOption.specifications) {
                            allSelectedSpecs.push(...selectedOption.specifications)
                          }
                        }
                      })
                      
                      if (allSelectedSpecs.length > 0) {
                        return (
                          <div className="pt-4 border-t">
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Specifications</h3>
                            <div className="grid gap-2">
                              {allSelectedSpecs.map((spec, index) => (
                                <div key={index} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                                  <span className="text-sm text-muted-foreground">{spec.label}</span>
                                  <span className="text-sm font-medium">{spec.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      
                      // Show hint to select options
                      const hasAnySpecs = item.variants.some((v: any) => 
                        v.options.some((o: any) => typeof o === 'object' && o.specifications && o.specifications.length > 0)
                      )
                      if (hasAnySpecs && Object.keys(selectedVariants).length === 0) {
                        return (
                          <p className="text-xs text-muted-foreground pt-2">
                            Select an option above to view specifications
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>
                )}

                {/* Desktop Actions - hidden on mobile */}
                <div className="hidden md:flex flex-col sm:flex-row gap-3 pt-6">
                {images.length > 1 && (
                  <Button 
                    size="lg"
                    variant="outline" 
                    className="flex-1"
                    onClick={handleOpenManageImages}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                    Reorder Images
                  </Button>
                )}
                <Button 
                  size="lg" 
                  className="flex-1"
                  onClick={handleOpenEdit}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Item
                </Button>
                <Button 
                  size="lg"
                  variant="outline" 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Item
                </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 backdrop-blur-sm border-t p-4 space-y-2">
        {images.length > 1 && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleOpenManageImages}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            Reorder Images
          </Button>
        )}
        <div className="flex gap-2">
          <Button 
            className="flex-1"
            onClick={handleOpenEdit}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setDeleteDialogOpen(true)}
            className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </Button>
        </div>
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
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    variant="outline"
                    size="sm"
                    onClick={() => setEditSpecifications([...editSpecifications, { label: '', value: '' }])}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Spec
                  </Button>
                </div>
                {editSpecifications.map((spec, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={spec.label}
                      onChange={(e) => {
                        const newSpecs = [...editSpecifications]
                        newSpecs[index].label = e.target.value
                        setEditSpecifications(newSpecs)
                      }}
                      placeholder="Label (e.g. Size)"
                      className="flex-1"
                    />
                    <Input
                      value={spec.value}
                      onChange={(e) => {
                        const newSpecs = [...editSpecifications]
                        newSpecs[index].value = e.target.value
                        setEditSpecifications(newSpecs)
                      }}
                      placeholder="Value (e.g. Large)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
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
                    variant="outline"
                    size="sm"
                    onClick={() => setEditVariants([...editVariants, { name: '', options: [{ value: '', specifications: [] }] }])}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Variant
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Add product variants like Size, Color, or Material. Each option can have its own specifications.</p>
              {editVariants.map((variant, vIndex) => (
                <div key={vIndex} className="border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={variant.name}
                      onChange={(e) => {
                        const newVariants = [...editVariants]
                        newVariants[vIndex].name = e.target.value
                        setEditVariants(newVariants)
                      }}
                      placeholder="Variant name (e.g. Size, Color)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
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
                        <div className="flex gap-2">
                          <Input
                            value={option.value}
                            onChange={(e) => {
                              const newVariants = [...editVariants]
                              newVariants[vIndex].options[oIndex].value = e.target.value
                              setEditVariants(newVariants)
                            }}
                            placeholder={`Option ${oIndex + 1} (e.g. Small, Red)`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
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
                            <div key={sIndex} className="flex gap-1">
                              <Input
                                value={spec.label}
                                onChange={(e) => {
                                  const newVariants = [...editVariants]
                                  newVariants[vIndex].options[oIndex].specifications[sIndex].label = e.target.value
                                  setEditVariants(newVariants)
                                }}
                                placeholder="Label"
                                className="flex-1 h-8 text-xs"
                              />
                              <Input
                                value={spec.value}
                                onChange={(e) => {
                                  const newVariants = [...editVariants]
                                  newVariants[vIndex].options[oIndex].specifications[sIndex].value = e.target.value
                                  setEditVariants(newVariants)
                                }}
                                placeholder="Value"
                                className="flex-1 h-8 text-xs"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
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
              onClick={handleEditItem}
              disabled={!editName || !hasEditChanges || editUploading || updateItemMutation.isPending}
            >
              {editUploading || updateItemMutation.isPending ? 'Updating...' : 'Update Item'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Manage Images Sheet */}
      <Sheet open={manageImagesOpen} onOpenChange={setManageImagesOpen}>
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Reorder Images</SheetTitle>
            <SheetDescription>Drag images to change their order. The first image will be the thumbnail.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <SortableImageGrid
              images={managedImages}
              onReorder={setManagedImages}
              columns={2}
            />
          </div>
          <SheetFooter className="border-t pt-4 mt-4">
            <Button
              variant="outline"
              onClick={() => setManageImagesOpen(false)}
              disabled={reorderImagesMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveImageOrder}
              disabled={!hasOrderChanges || reorderImagesMutation.isPending}
            >
              {reorderImagesMutation.isPending ? 'Saving...' : 'Save Order'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={item.name}
        onConfirm={() => {
          deleteItemMutation.mutate()
          setDeleteDialogOpen(false)
        }}
        isLoading={deleteItemMutation.isPending}
      />
    </div>
  )
}
