'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { catalogApi } from '@/lib/api'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'

export default function ViewCatalogPage() {
  const params = useParams()
  const router = useRouter()
  const [code, setCode] = useState((params.code as string) || '')
  const [catalog, setCatalog] = useState<any>(null)
  const [loading, setLoading] = useState(!!params.code)
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)
  
  // Variant selection sheet state
  const [variantSheetOpen, setVariantSheetOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  useEffect(() => {
    if (params.code) {
      loadCatalog(params.code as string)
    }
  }, [params.code])

  const loadCatalog = async (shareCode: string) => {
    setLoading(true)
    const { data, error } = await catalogApi.viewByCode(shareCode)

    if (error) {
      toast.error(error.detail || 'Invalid or expired code')
      setLoading(false)
      // Redirect to base view page to enter a new code
      router.push('/view')
      return
    }

    if (data) {
      setCatalog(data)
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code) {
      loadCatalog(code)
    }
  }

  // Check if item has variants
  const itemHasVariants = useCallback((item: any) => {
    return item.variants && Array.isArray(item.variants) && item.variants.length > 0
  }, [])

  // Open variant sheet for items with variants
  const handleOpenVariantSheet = (item: any, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedItem(item)
    // Auto-select first option for each variant
    const defaultSelections: Record<string, string> = {}
    if (item.variants) {
      item.variants.forEach((variant: any) => {
        if (variant.options && variant.options.length > 0) {
          const firstOption = variant.options[0]
          defaultSelections[variant.name] = typeof firstOption === 'string' ? firstOption : firstOption.value
        }
      })
    }
    setSelectedVariants(defaultSelections)
    setVariantSheetOpen(true)
  }

  // Handle variant selection in sheet
  const handleVariantSelect = (variantName: string, optionValue: string) => {
    setSelectedVariants(prev => ({ ...prev, [variantName]: optionValue }))
  }

  // Get product URL with variants
  const getProductUrl = useCallback((item: any, variants?: Record<string, string>) => {
    if (!catalog) return ''
    let productUrl = `${window.location.origin}/dashboard/catalogs/${catalog.id}/items/${item.id}`
    const variantParams = variants || selectedVariants
    if (Object.keys(variantParams).length > 0) {
      const queryString = Object.entries(variantParams)
        .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
        .join('&')
      productUrl += `?${queryString}`
    }
    return productUrl
  }, [catalog, selectedVariants])

  // Copy link with variants from sheet
  const handleCopyWithVariants = async () => {
    if (!catalog || !selectedItem) return
    
    try {
      const productUrl = getProductUrl(selectedItem, selectedVariants)
      await navigator.clipboard.writeText(productUrl)
      setCopiedItemId(selectedItem.id)
      setVariantSheetOpen(false)
      toast.success('Product link copied!')
      setTimeout(() => {
        setCopiedItemId(null)
      }, 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  // Share link with variants from sheet
  const handleShareWithVariants = async () => {
    if (!catalog || !selectedItem) return
    
    try {
      const productUrl = getProductUrl(selectedItem, selectedVariants)
      
      if (navigator.share) {
        await navigator.share({
          title: selectedItem.name,
          text: `Check out ${selectedItem.name}`,
          url: productUrl
        })
        setVariantSheetOpen(false)
      } else {
        // Fallback to copy if share is not available
        await navigator.clipboard.writeText(productUrl)
        setCopiedItemId(selectedItem.id)
        setVariantSheetOpen(false)
        toast.success('Product link copied!')
        setTimeout(() => {
          setCopiedItemId(null)
        }, 2000)
      }
    } catch (error: any) {
      // User cancelled share or error occurred
      if (error.name !== 'AbortError') {
        toast.error('Failed to share link')
      }
    }
  }

  const handleCopyProductLink = async (item: any, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // If item has variants, open the sheet
    if (itemHasVariants(item)) {
      handleOpenVariantSheet(item, e)
      return
    }
    
    // Otherwise copy directly
    try {
      if (!catalog) {
        toast.error('Catalog not loaded')
        return
      }
      const productUrl = getProductUrl(item)
      await navigator.clipboard.writeText(productUrl)
      setCopiedItemId(item.id)
      toast.success('Product link copied!')
      setTimeout(() => {
        setCopiedItemId(null)
      }, 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleShareProductLink = async (item: any, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // If item has variants, open the sheet
    if (itemHasVariants(item)) {
      handleOpenVariantSheet(item, e)
      return
    }
    
    // Otherwise share directly
    try {
      if (!catalog) {
        toast.error('Catalog not loaded')
        return
      }
      const productUrl = getProductUrl(item)
      
      if (navigator.share) {
        await navigator.share({
          title: item.name,
          text: `Check out ${item.name}`,
          url: productUrl
        })
      } else {
        // Fallback to copy if share is not available
        await navigator.clipboard.writeText(productUrl)
        setCopiedItemId(item.id)
        toast.success('Product link copied!')
        setTimeout(() => {
          setCopiedItemId(null)
        }, 2000)
      }
    } catch (error: any) {
      // User cancelled share or error occurred
      if (error.name !== 'AbortError') {
        toast.error('Failed to share link')
      }
    }
  }

  if (loading && !catalog) {
    return (
      <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-4 pb-6 border-b">
            <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full h-56" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (catalog) {
    return (
      <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2 pb-6 border-b">
            <div className="flex justify-center mb-2">
              <Image
                src="/catalink-logo.png"
                alt="Catalink Logo"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">{catalog.title}</h1>
            {catalog.description && (
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{catalog.description}</p>
            )}
          </div>

          {catalog.items && catalog.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {catalog.items.map((item: any) => {
                // Handle both old imageUrl and new images array structure
                const firstImage = item.images && Array.isArray(item.images) && item.images.length > 0 
                  ? item.images[0] 
                  : item.imageUrl 
                    ? { url: item.imageUrl }
                    : null
                
                const imageUrl = firstImage?.url || firstImage
                
                return (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow border-2">
                    <Link href={`/view/${code}/items/${item.id}`} className="block">
                      {imageUrl ? (
                        <div className="relative w-full h-32 md:h-56 bg-muted">
                          <Image
                            src={imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                            unoptimized
                            onError={(e) => {
                              console.error('Image load error:', imageUrl, e)
                            }}
                          />
                        </div>
                      ) : (
                        <div className="relative w-full h-32 md:h-56 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                          <svg className="w-10 h-10 md:w-16 md:h-16 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <CardHeader className="p-2 md:p-6 pb-2 md:pb-3">
                        <CardTitle className="line-clamp-2 text-sm md:text-base">{item.name}</CardTitle>
                      </CardHeader>
                    </Link>
                    {/* Copy and Share Buttons */}
                    <div className="px-2 md:px-6 pb-2 md:pb-4 space-y-1 md:space-y-2">
                      {itemHasVariants(item) ? (
                        <Button
                          onClick={(e) => handleCopyProductLink(item, e)}
                          variant="outline"
                          className="w-full text-xs md:text-sm"
                          size="sm"
                        >
                          <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                          </svg>
                          <span className="hidden md:inline">Select Options</span>
                          <span className="md:hidden">Select</span>
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={(e) => handleCopyProductLink(item, e)}
                            variant={copiedItemId === item.id ? "default" : "outline"}
                            className="flex-1 text-xs md:text-sm"
                            size="sm"
                          >
                            {copiedItemId === item.id ? (
                              <>
                                <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copied
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="hidden md:inline">Copy</span>
                                <span className="md:hidden">Copy</span>
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={(e) => handleShareProductLink(item, e)}
                            variant="default"
                            className="md:flex-1 text-xs md:text-sm px-2 md:px-4"
                            size="sm"
                          >
                            <svg className="w-3 h-3 md:w-4 md:h-4 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span className="hidden md:inline">Share</span>
                          </Button>
                        </div>
                      )}
                      <p className="text-[10px] md:text-xs text-muted-foreground text-center">
                        Send to your sales team or customer
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-2">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-muted-foreground text-lg">No items in this catalog yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Variant Selection Bottom Sheet */}
        <Sheet open={variantSheetOpen} onOpenChange={setVariantSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-xl max-h-[80vh] flex flex-col">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle className="flex items-center gap-3">
                {(() => {
                  const firstImage = selectedItem?.images?.[0]
                  const imageUrl = firstImage ? (typeof firstImage === 'string' ? firstImage : firstImage.url) : null
                  return imageUrl ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={imageUrl}
                        alt={selectedItem?.name || 'Product'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : null
                })()}
                <span className="line-clamp-2">{selectedItem?.name}</span>
              </SheetTitle>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Show specifications for selected variants */}
              {(() => {
                // Collect specifications from all selected variant options
                const allSpecs: { label: string; value: string }[] = []
                selectedItem?.variants?.forEach((variant: any) => {
                  const selectedValue = selectedVariants[variant.name]
                  if (selectedValue) {
                    const selectedOption = variant.options?.find((opt: any) => 
                      (typeof opt === 'string' ? opt : opt.value) === selectedValue
                    )
                    if (selectedOption && typeof selectedOption !== 'string' && selectedOption.specifications) {
                      selectedOption.specifications.forEach((spec: any) => {
                        if (spec.label && spec.value) {
                          allSpecs.push(spec)
                        }
                      })
                    }
                  }
                })

                if (allSpecs.length === 0) return null

                return (
                  <div className="space-y-3 pb-4 border-b">
                    <h4 className="font-medium text-sm text-muted-foreground">Specifications</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {allSpecs.map((spec, index) => (
                        <div key={index} className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">{spec.label}</p>
                          <p className="font-medium text-sm">{spec.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {selectedItem?.variants?.map((variant: any, index: number) => (
                <div key={index} className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">{variant.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {variant.options?.map((option: any, optIndex: number) => {
                      const optionValue = typeof option === 'string' ? option : option.value
                      const isSelected = selectedVariants[variant.name] === optionValue
                      return (
                        <Button
                          key={optIndex}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleVariantSelect(variant.name, optionValue)}
                          className="min-w-[60px]"
                        >
                          {optionValue}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <SheetFooter className="pt-4 border-t gap-2">
              <Button
                onClick={handleCopyWithVariants}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </Button>
              <Button
                onClick={handleShareWithVariants}
                variant="default"
                className="flex-1"
                size="lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-2">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-3xl">Catalink</CardTitle>
            <CardDescription className="text-base">Enter your share code to access the catalog</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter share code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="text-center text-lg font-mono tracking-wider"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full py-4" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Accessing...
                </>
              ) : (
                'Access Catalog'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

