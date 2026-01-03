'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { catalogApi } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

export default function ViewItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const itemId = params.itemId as string

  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [[page, direction], setPage] = useState([0, 0])
  const [catalog, setCatalog] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

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

  const totalImages = item?.images?.length || 0

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

  // Copy product link
  const handleCopyLink = useCallback(async () => {
    try {
      if (!catalog) {
        toast.error('Catalog not loaded')
        return
      }
      const productUrl = `${window.location.origin}/dashboard/catalogs/${catalog.id}/items/${itemId}`
      await navigator.clipboard.writeText(productUrl)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }, [catalog, itemId])

  // Get images from item
  const images = item?.images || []
  const hasImages = images.length > 0
  const selectedImage = hasImages ? images[selectedImageIndex] : null

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
                  
                  {/* Metadata Skeleton */}
                  <div className="grid gap-4 pt-6 border-t">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                  </div>
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
      {/* Main scrollable content */}
      <div className="p-4 pb-8 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          {/* Breadcrumb */}
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

                {/* Price */}
                {item.price ? (
                  <div className="inline-flex items-baseline gap-1">
                    <span className="text-2xl md:text-3xl lg:text-4xl font-semibold text-muted-foreground">₱{formatPrice(item.price)}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                    <span className="text-muted-foreground">No price set</span>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid gap-4 pt-6 border-t">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Catalog</p>
                      <Link 
                        href={`/view/${code}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {catalog.title}
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Added on</p>
                      <p className="font-medium">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Copy Link Button */}
                <div className="pt-6 space-y-2">
                  <Button
                    onClick={handleCopyLink}
                    className="w-full"
                    size="lg"
                    variant={copied ? "default" : "outline"}
                  >
                    {copied ? (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Product Link
                      </>
                    )}
                  </Button>
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

