'use client'

import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'

export interface ImageItem {
  id: string
  url: string
  order: number
  isNew?: boolean
  file?: File
  variantOptions?: Record<string, string> // e.g., {"Color": "Red", "Size": "M"}
}

interface SortableImageProps {
  image: ImageItem
  onRemove?: (id: string) => void
}

function SortableImage({ image, onRemove }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square bg-muted rounded-lg overflow-hidden group ${
        isDragging ? 'z-50 shadow-xl ring-2 ring-primary' : ''
      }`}
    >
      <Image
        src={image.url}
        alt=""
        fill
        className="object-cover"
      />
      
      {/* Drag handle overlay */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(image.id)
          }}
          className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* NEW badge for pending uploads */}
      {image.isNew && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded">
          NEW
        </div>
      )}

      {/* Order badge */}
      <div className="absolute bottom-1 left-1 w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
        {image.order + 1}
      </div>
    </div>
  )
}

interface SortableImageGridProps {
  images: ImageItem[]
  onReorder: (images: ImageItem[]) => void
  onRemove?: (id: string) => void
  columns?: number
}

export function SortableImageGrid({ 
  images, 
  onReorder, 
  onRemove,
  columns = 3 
}: SortableImageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id)
      const newIndex = images.findIndex((img) => img.id === over.id)

      const newImages = arrayMove(images, oldIndex, newIndex).map((img, idx) => ({
        ...img,
        order: idx,
      }))

      onReorder(newImages)
    }
  }

  if (images.length === 0) {
    return null
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {images.map((image) => (
            <SortableImage
              key={image.id}
              image={image}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Drag images to reorder. First image will be the thumbnail.
      </p>
    </DndContext>
  )
}

// Helper hook to manage combined images (existing + new files)
export function useImageManager(existingImages: { id: string; url: string; order: number }[] = []) {
  const [allImages, setAllImages] = useState<ImageItem[]>([])

  // Initialize with existing images
  useEffect(() => {
    setAllImages(existingImages.map(img => ({
      ...img,
      isNew: false,
    })))
  }, []) // Only run on mount

  // Add new files
  const addFiles = (files: File[]) => {
    const startOrder = allImages.length
    const newImages: ImageItem[] = files.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      url: URL.createObjectURL(file),
      order: startOrder + idx,
      isNew: true,
      file,
    }))
    
    setAllImages(prev => [...prev, ...newImages])
  }

  // Remove an image
  const removeImage = (id: string) => {
    setAllImages(prev => {
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

  // Reorder images
  const reorderImages = (newImages: ImageItem[]) => {
    setAllImages(newImages)
  }

  // Reset to initial state
  const reset = () => {
    // Revoke all blob URLs
    allImages.forEach(img => {
      if (img.isNew && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url)
      }
    })
    setAllImages([])
  }

  // Get files to upload in order
  const getFilesToUpload = (): File[] => {
    return allImages
      .filter(img => img.isNew && img.file)
      .map(img => img.file!)
  }

  // Get existing image URLs in order
  const getExistingUrls = (): string[] => {
    return allImages
      .filter(img => !img.isNew)
      .map(img => img.url)
  }

  // Get all URLs in final order (existing ones only, new ones need upload first)
  const getAllUrlsInOrder = (): { existingUrls: string[]; newFiles: File[] } => {
    const existingUrls: string[] = []
    const newFiles: File[] = []
    
    allImages.forEach(img => {
      if (img.isNew && img.file) {
        newFiles.push(img.file)
      } else if (!img.isNew) {
        existingUrls.push(img.url)
      }
    })
    
    return { existingUrls, newFiles }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      allImages.forEach(img => {
        if (img.isNew && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url)
        }
      })
    }
  }, [])

  return {
    allImages,
    setAllImages,
    addFiles,
    removeImage,
    reorderImages,
    reset,
    getFilesToUpload,
    getExistingUrls,
    getAllUrlsInOrder,
  }
}
