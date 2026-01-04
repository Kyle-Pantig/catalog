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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
  const [lightboxVisible, setLightboxVisible] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

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
    // Reset image index when variants change
    setSelectedImageIndex(0)
    setPage([0, 0])
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
  const isUpdatingRef = useRef(false)

  // Initial state for change detection
  const [initialEditState, setInitialEditState] = useState<{
    name: string
    description: string
    imageIds: string[]
    imageVariantOptions: Record<string, string>[]
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
    
    // Check if variantOptions on images have changed
    const currentImageVariantOptions = editImages
      .filter(img => !img.isNew)
      .map(img => JSON.stringify(img.variantOptions || {}))
      .sort()
      .join('|')
    const initialImageVariantOptions = (initialEditState.imageVariantOptions || [])
      .map((opts: any) => JSON.stringify(opts || {}))
      .sort()
      .join('|')
    if (currentImageVariantOptions !== initialImageVariantOptions) return true
    
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

  // Navigate to a specific image index (in allImages) and auto-select variants if needed
  const navigateToImage = useCallback((newIndex: number, allImgs: any[]) => {
    if (newIndex < 0 || newIndex >= allImgs.length) return
    
    const targetImage = allImgs[newIndex]
    const newDirection = newIndex > selectedImageIndex ? 1 : -1
    
    // If target image has variant options, auto-select them
    if (targetImage?.variantOptions && Object.keys(targetImage.variantOptions).length > 0) {
      const newSelections = { ...selectedVariants }
      Object.entries(targetImage.variantOptions).forEach(([variantName, optionValue]) => {
        newSelections[variantName] = optionValue as string
      })
      setSelectedVariants(newSelections)
      updateVariantUrl(newSelections)
    }
    
    setPage([page + newDirection, newDirection])
    setSelectedImageIndex(newIndex)
  }, [selectedImageIndex, selectedVariants, updateVariantUrl, page])

  const goToPrevImage = useCallback((allImgs: any[]) => {
    if (selectedImageIndex > 0) {
      navigateToImage(selectedImageIndex - 1, allImgs)
    }
  }, [selectedImageIndex, navigateToImage])

  const goToNextImage = useCallback((allImgs: any[]) => {
    if (selectedImageIndex < allImgs.length - 1) {
      navigateToImage(selectedImageIndex + 1, allImgs)
    }
  }, [selectedImageIndex, navigateToImage])

  // Direct image selection (for thumbnails/dots)
  const goToImage = useCallback((index: number, allImgs: any[]) => {
    navigateToImage(index, allImgs)
  }, [navigateToImage])

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemData }: { itemData: { name?: string; description?: string; images?: string[] | Array<{ url: string; order?: number; variantOptions?: Record<string, string> }>; specifications?: { label: string; value: string }[]; variants?: { name: string; options: { value: string; specifications?: { label: string; value: string }[] }[] }[] } }) => {
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
      setDeleteDialogOpen(false)
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
    // Reset update ref
    isUpdatingRef.current = false
    setEditOpen(false)
    setEditName('')
    setEditDescription('')
    setEditImages([])
    setEditSpecifications([])
    setEditVariants([])
    setInitialEditState(null)
  }

  const handleEditItem = useCallback(async () => {
    if (!editName || !item) {
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

      // Reconstruct final image data array in correct order with variantOptions
      const finalImages = imageOrder.map((orderItem, idx) => {
        const imageItem = editImages.find((img, i) => {
          if (orderItem.type === 'existing') {
            return !img.isNew && img.url === existingUrls[orderItem.index]
          } else {
            return img.isNew && filesToUpload[orderItem.index] === img.file
          }
        })
        
        const url = orderItem.type === 'existing' 
          ? existingUrls[orderItem.index] 
          : newUrls[orderItem.index]
        
        return {
          url,
          order: idx,
          variantOptions: imageItem?.variantOptions || undefined,
        }
      }).filter(img => img.url)

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
          images: finalImages.length > 0 ? finalImages : undefined,
          specifications: validSpecs.length > 0 ? validSpecs : undefined,
          variants: validVariants,
        },
      })
    } catch (error) {
      isUpdatingRef.current = false
      setEditUploading(false)
    }
  }, [editName, item, editImages, editDescription, editSpecifications, editVariants, catalogId, editUploading, updateItemMutation])

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
        variantOptions: img.variantOptions || undefined,
      })) || [])
      setEditSpecifications(specs.length > 0 ? specs : [])
      setEditVariants(convertedVars.length > 0 ? convertedVars : [])
      
      // Store initial state for change detection
      const initialImageVariantOptions = item.images?.map((img: any) => img.variantOptions || {}) || []
      setInitialEditState({
        name: item.name,
        description: item.description || '',
        imageIds: imageIds,
        imageVariantOptions: initialImageVariantOptions,
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

  // All images for navigation (use original order from item)
  const allImages = item?.images || []
  const hasImages = allImages.length > 0
  const selectedImage = hasImages ? allImages[selectedImageIndex] : null

  // Handle clicking on a thumbnail image
  const handleThumbnailClick = useCallback((img: any, allImagesIndex: number) => {
    if (!item?.images) return
    goToImage(allImagesIndex, item.images)
  }, [goToImage, item])

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

                </div>
              </div>
            </div>
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
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
            {/* Image Section */}
            <PhotoProvider
              {...{
                visible: lightboxVisible,
                onVisibleChange: (visible: boolean) => setLightboxVisible(visible),
                index: lightboxIndex,
                onIndexChange: (index: number) => setLightboxIndex(index),
              } as any}
            >
              <div className="space-y-4">
                {/* Hidden PhotoViews to register all images for the lightbox gallery */}
                <div style={{ display: 'none' }}>
                  {allImages.map((img: any, idx: number) => (
                    <PhotoView key={img.id || idx} src={img.url}>
                      <img src={img.url} alt="" />
                    </PhotoView>
                  ))}
                </div>
                
                {/* Main Image with Swipe Support */}
                {hasImages ? (
                  <div 
                    className="relative aspect-square bg-muted rounded-2xl overflow-hidden border shadow-lg select-none"
                  >
                    {/* Single AnimatePresence for smooth transitions */}
                    <AnimatePresence initial={false} custom={direction} mode="wait">
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
                        className="absolute inset-0 cursor-pointer"
                        onClick={() => {
                          setLightboxIndex(selectedImageIndex)
                          setLightboxVisible(true)
                        }}
                      >
                        <Image
                          src={selectedImage?.url}
                          alt={item.name}
                          fill
                          className="object-cover pointer-events-none"
                          priority
                          draggable={false}
                        />
                      </motion.div>
                    </AnimatePresence>
                  
                    {/* Navigation Arrows */}
                    {allImages.length > 1 && (
                      <>
                        {/* Left Arrow */}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation()
                            goToPrevImage(allImages)
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
                            goToNextImage(allImages)
                          }}
                          disabled={selectedImageIndex === allImages.length - 1}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center transition-opacity ${
                            selectedImageIndex === allImages.length - 1 
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
                          key={`counter-${selectedImageIndex}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-black/60 text-white text-sm font-medium rounded-full pointer-events-none"
                        >
                          {selectedImageIndex + 1} / {allImages.length}
                        </motion.div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex flex-col items-center justify-center border shadow-lg">
                    <svg className="w-32 h-32 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-muted-foreground/50 mt-4 text-sm">No images available</p>
                  </div>
                )}

                {/* Image Thumbnails */}
                {allImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {allImages.map((img: any, idx: number) => {
                      const isSelected = idx === selectedImageIndex
                      
                      return (
                        <button
                          key={img.id || idx}
                          onClick={() => handleThumbnailClick(img, idx)}
                          className={`relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            isSelected
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
                      )
                    })}
                  </div>
                )}
              </div>
            </PhotoProvider>

            {/* Details Section */}
            <div className="flex flex-col">
              <div className="flex-1 space-y-6">
                {/* Title */}
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight flex-1">{item.name}</h1>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {allImages.length > 1 && (
                        <DropdownMenuItem onClick={handleOpenManageImages}>
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                          Reorder Images
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleOpenEdit}>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Item
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Item
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

              </div>
            </div>
          </div>
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
                Description <span className="text-xs text-muted-foreground font-normal">(optional)</span>
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
                    Specifications <span className="text-xs text-muted-foreground font-normal">(optional)</span>
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
                    Variants <span className="text-xs text-muted-foreground font-normal">(optional)</span>
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
                <p className="text-xs text-muted-foreground">Add product variants like Size, Color, or Material. Each option can have its own specifications.</p>
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">All Images (drag to reorder)</label>
                  <SortableImageGrid
                    images={editImages}
                    onReorder={setEditImages}
                    onRemove={handleRemoveEditImage}
                    columns={3}
                  />
                </div>
                {/* Assign variant options to images */}
                {editVariants.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Assign Images to Variant Options</label>
                      <span className="text-xs text-muted-foreground">(optional)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Assign images to specific variant options. When a customer selects that option, they'll see the assigned image.
                    </p>
                    <div className="space-y-3">
                      {editImages.map((img, imgIndex) => (
                        <div key={img.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="relative w-16 h-16 rounded-md overflow-hidden border flex-shrink-0">
                              <Image
                                src={img.url}
                                alt={`Image ${imgIndex + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="text-xs font-medium">Image {imgIndex + 1}</div>
                              {editVariants.map((variant) => {
                                // Check which options are already assigned to other images
                                const isOptionAssigned = (optionValue: string) => {
                                  return editImages.some((otherImg, otherIdx) => 
                                    otherIdx !== imgIndex && 
                                    otherImg.variantOptions?.[variant.name] === optionValue
                                  )
                                }
                                
                                return (
                                  <div key={variant.name} className="space-y-1">
                                    <label className="text-xs text-muted-foreground">{variant.name}</label>
                                    <select
                                      value={img.variantOptions?.[variant.name] || ''}
                                      onChange={(e) => {
                                        const newImages = [...editImages]
                                        if (!newImages[imgIndex].variantOptions) {
                                          newImages[imgIndex].variantOptions = {}
                                        }
                                        if (e.target.value) {
                                          newImages[imgIndex].variantOptions![variant.name] = e.target.value
                                        } else {
                                          delete newImages[imgIndex].variantOptions![variant.name]
                                          if (Object.keys(newImages[imgIndex].variantOptions!).length === 0) {
                                            delete newImages[imgIndex].variantOptions
                                          }
                                        }
                                        setEditImages(newImages)
                                      }}
                                      className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                      <option value="">None (show for all)</option>
                                      {variant.options.map((option) => {
                                        const isAssigned = isOptionAssigned(option.value)
                                        const isCurrentSelection = img.variantOptions?.[variant.name] === option.value
                                        const isDisabled = isAssigned && !isCurrentSelection
                                        
                                        return (
                                          <option 
                                            key={option.value} 
                                            value={option.value}
                                            disabled={isDisabled}
                                          >
                                            {option.value}{isDisabled ? ' (already assigned)' : ''}
                                          </option>
                                        )
                                      })}
                                    </select>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
        }}
        isLoading={deleteItemMutation.isPending}
      />
    </div>
  )
}
