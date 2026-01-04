'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { catalogApi } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

export default function ViewItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = params.code as string
  const itemId = params.itemId as string

  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [[page, direction], setPage] = useState([0, 0])
  const [catalog, setCatalog] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  // Update URL when variant selection changes
  const updateVariantUrl = useCallback((newSelections: Record<string, string>) => {
    const params = new URLSearchParams()
    Object.entries(newSelections).forEach(([key, value]) => {
      params.set(key, value)
    })
    const queryString = params.toString()
    const newUrl = queryString 
      ? `/view/${code}/items/${itemId}?${queryString}`
      : `/view/${code}/items/${itemId}`
    router.replace(newUrl, { scroll: false })
  }, [code, itemId, router])

  // Handle variant selection (user interaction)
  const handleVariantSelect = useCallback((variantName: string, optionValue: string) => {
    const newSelections = { ...selectedVariants, [variantName]: optionValue }
    setSelectedVariants(newSelections)
    updateVariantUrl(newSelections)
    // Reset image index when variants change
    setSelectedImageIndex(0)
    setPage([0, 0])
  }, [selectedVariants, updateVariantUrl])

  useEffect(() => {
    if (code) {
      loadCatalog(code)
    }
  }, [code])

  const loadCatalog = async (shareCode: string) => {
    setLoading(true)
    const { data, error } = await catalogApi.viewByCode(shareCode)

    if (error) {
      toast.error(error.detail || 'Invalid or expired code')
      setLoading(false)
      // Redirect to catalog view page or enter code form
      router.push(`/view/${code}`)
      return
    }

    if (data) {
      setCatalog(data)
      setLoading(false)
    }
  }

  const item = catalog?.items?.find((i: any) => i.id === itemId)

  // Filter images based on selected variants
  const filteredImages = useMemo(() => {
    if (!item?.images) return []
    
    const images = item.images
    
    // If no variants selected or item has no variants, return all images
    if (!item.variants || item.variants.length === 0 || Object.keys(selectedVariants).length === 0) {
      // Return images without variant options first, then images with variant options
      const withoutVariants = images.filter((img: any) => !img.variantOptions || Object.keys(img.variantOptions || {}).length === 0)
      const withVariants = images.filter((img: any) => img.variantOptions && Object.keys(img.variantOptions).length > 0)
      return [...withoutVariants, ...withVariants]
    }
    
    // Filter images that match selected variants
    const matchingImages = images.filter((img: any) => {
      if (!img.variantOptions || Object.keys(img.variantOptions).length === 0) {
        // Images without variant options are always shown
        return true
      }
      
      // Check if image's variant options match selected variants
      const imgVariants = img.variantOptions || {}
      return Object.keys(selectedVariants).every(variantName => {
        const selectedValue = selectedVariants[variantName]
        const imgValue = imgVariants[variantName]
        // If image has this variant, it must match; if not, it's okay
        return !imgValue || imgValue === selectedValue
      })
    })
    
    // If we have matching images, return them; otherwise return all images
    return matchingImages.length > 0 ? matchingImages : images
  }, [item?.images, selectedVariants])

  const totalImages = filteredImages.length || 0

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
  
  // Sync selectedVariants with URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    if (item?.variants && item.variants.length > 0 && Object.keys(selectedVariants).length > 0) {
      const urlSelections: Record<string, string> = {}
      let hasUrlParams = false
      
      item.variants.forEach((variant: { name: string; options: any[] }) => {
        const urlValue = searchParams.get(variant.name)
        if (urlValue) {
          const validOption = variant.options.find((o: any) => 
            (typeof o === 'string' ? o : o.value) === urlValue
          )
          if (validOption) {
            urlSelections[variant.name] = urlValue
            hasUrlParams = true
          }
        }
      })
      
      // Only update if URL params exist and differ from current selections
      if (hasUrlParams) {
        const currentStr = JSON.stringify(selectedVariants)
        const urlStr = JSON.stringify(urlSelections)
        if (currentStr !== urlStr) {
          setSelectedVariants(urlSelections)
          // Reset image index when variants change from URL
          setSelectedImageIndex(0)
          setPage([0, 0])
        }
      }
    }
  }, [searchParams, item?.variants, selectedVariants])

  // Check if item has variants and if all variants are selected
  const hasVariants = item?.variants && item.variants.length > 0
  const allVariantsSelected = hasVariants 
    ? item.variants.every((v: { name: string }) => selectedVariants[v.name])
    : true

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

  // Get product URL with variants
  const getProductUrl = useCallback(() => {
    if (!catalog) return ''
    let productUrl = `${window.location.origin}/dashboard/catalogs/${catalog.id}/items/${itemId}`
    if (hasVariants && Object.keys(selectedVariants).length > 0) {
      const queryString = Object.entries(selectedVariants)
        .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
        .join('&')
      productUrl += `?${queryString}`
    }
    return productUrl
  }, [catalog, itemId, hasVariants, selectedVariants])

  // Get share text with variants
  const getShareText = useCallback(() => {
    if (!item) return ''
    let text = `Check out ${item.name}`
    if (hasVariants && Object.keys(selectedVariants).length > 0) {
      const variantText = Object.entries(selectedVariants)
        .map(([name, value]) => `${name}: ${value}`)
        .join(', ')
      text += ` - ${variantText}`
    }
    return text
  }, [item, hasVariants, selectedVariants])

  // Copy product link with selected variants
  const handleCopyLink = useCallback(async () => {
    try {
      if (!catalog) {
        toast.error('Catalog not loaded')
        return
      }
      
      const productUrl = getProductUrl()
      await navigator.clipboard.writeText(productUrl)
      setCopied(true)
      toast.success('Product link copied!')
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }, [catalog, getProductUrl])

  // Share product link with selected variants
  const handleShareLink = useCallback(async () => {
    try {
      if (!catalog || !item) {
        toast.error('Catalog not loaded')
        return
      }
      
      const productUrl = getProductUrl()
      
      // Try Web Share API first if available
      if (navigator.share && typeof navigator.share === 'function') {
        try {
          const shareText = getShareText()
          await navigator.share({
            title: item.name,
            text: shareText,
            url: productUrl
          })
          // Share succeeded, return early
          return
        } catch (shareError: any) {
          // User cancelled share - don't fall back to copy, just return
          if (shareError.name === 'AbortError' || shareError.name === 'NotAllowedError') {
            return
          }
          // For other share errors, don't silently fall back - show error or try copy
          // Only fall back to copy if it's a clear "not supported" error
          if (shareError.name === 'TypeError' || shareError.message?.includes('not supported')) {
            // Share not supported, fall through to copy
          } else {
            // Other error - don't fall back, just return
            return
          }
        }
      }
      
      // Fallback to copy only if share is not available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(productUrl)
        setCopied(true)
        toast.success('Product link copied!')
        setTimeout(() => {
          setCopied(false)
        }, 2000)
      } else {
        // Last resort: use a temporary textarea for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = productUrl
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          setCopied(true)
          toast.success('Product link copied!')
          setTimeout(() => {
            setCopied(false)
          }, 2000)
        } catch (err) {
          toast.error('Failed to copy link')
        } finally {
          document.body.removeChild(textarea)
        }
      }
    } catch (error: any) {
      toast.error('Failed to share link')
    }
  }, [catalog, item, getProductUrl])

  // Get images from item (filtered by variants for main display)
  const images = filteredImages
  const hasImages = images.length > 0
  const selectedImage = hasImages ? images[selectedImageIndex] : null
  
  // For thumbnails, always show all images so users can see all available images
  const allImages = item?.images || []
  
  // Get the actual position of the selected image in all images
  const selectedImagePosition = useMemo(() => {
    if (!selectedImage || !allImages.length) return 0
    const position = allImages.findIndex((img: any) => img.id === selectedImage.id)
    return position !== -1 ? position + 1 : 0
  }, [selectedImage, allImages])
  
  // Handle clicking on a thumbnail image - switch variants if needed
  const handleThumbnailClick = useCallback((img: any, allImagesIndex: number) => {
    if (!item?.images) return
    
    const filteredIndex = images.findIndex((filteredImg: any) => filteredImg.id === img.id)
    const isVisible = filteredIndex !== -1
    
    if (isVisible) {
      // Image is already visible, just switch to it
      goToImage(filteredIndex)
    } else {
      // Image is not visible - switch variants to make it visible
      if (img.variantOptions && Object.keys(img.variantOptions).length > 0) {
        // Update selected variants to match this image's variant options
        const newSelections = { ...selectedVariants }
        Object.entries(img.variantOptions).forEach(([variantName, optionValue]) => {
          newSelections[variantName] = optionValue as string
        })
        
        // Calculate what the filtered images will be with new selections
        const newFilteredImages = item.images.filter((filteredImg: any) => {
          if (!filteredImg.variantOptions || Object.keys(filteredImg.variantOptions).length === 0) {
            return true
          }
          const imgVariants = filteredImg.variantOptions || {}
          return Object.keys(newSelections).every(variantName => {
            const selectedValue = newSelections[variantName]
            const imgValue = imgVariants[variantName]
            return !imgValue || imgValue === selectedValue
          })
        })
        
        // Find the target image index in the new filtered list
        const targetIndex = newFilteredImages.findIndex((filteredImg: any) => filteredImg.id === img.id)
        
        // Update variants and navigate to the image
        setSelectedVariants(newSelections)
        updateVariantUrl(newSelections)
        
        // Navigate to the image after a brief delay to allow state update
        if (targetIndex !== -1) {
          setTimeout(() => {
            setSelectedImageIndex(targetIndex)
            setPage([0, 0])
          }, 100)
        }
      } else {
        // Image has no variant options, should always be visible
        const foundIndex = images.findIndex((filteredImg: any) => filteredImg.id === img.id)
        if (foundIndex !== -1) {
          goToImage(foundIndex)
        }
      }
    }
  }, [images, selectedVariants, updateVariantUrl, goToImage, item])

  if (loading || !catalog) {
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
              <Link href={`/view/${code}`}>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  Back to Catalog
                </button>
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
                href={`/view/${code}`}
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
      <div className="p-4 pb-8 md:p-8">
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
                                {selectedImagePosition} / {allImages.length}
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

                {/* Image Thumbnails - Show all images, but indicate which are visible */}
                {allImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {allImages.map((img: any, idx: number) => {
                      // Find the index in filtered images if this image is visible
                      const filteredIndex = images.findIndex((filteredImg: any) => filteredImg.id === img.id)
                      const isVisible = filteredIndex !== -1
                      const isSelected = isVisible && filteredIndex === selectedImageIndex
                      
                      return (
                        <button
                          key={img.id || idx}
                          onClick={() => handleThumbnailClick(img, idx)}
                          className={`relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                          title={!isVisible ? `Click to switch to variants: ${img.variantOptions ? Object.entries(img.variantOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : 'No variants'}` : ''}
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

                {/* Specifications */}
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

                    {!allVariantsSelected && (
                      <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Please select all options before copying the product link
                      </p>
                    )}
                  </div>
                )}

                {/* Copy and Share Buttons */}
                <div className="pt-6 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyLink}
                      className="flex-1"
                      size="lg"
                      variant={copied ? "default" : "outline"}
                      disabled={hasVariants && !allVariantsSelected}
                    >
                      {copied ? (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : hasVariants && !allVariantsSelected ? (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Select First
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleShareLink}
                      className="flex-1"
                      size="lg"
                      variant="default"
                      disabled={hasVariants && !allVariantsSelected}
                    >
                      {hasVariants && !allVariantsSelected ? (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Select First
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Share
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Send this link to your sales team or customer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

