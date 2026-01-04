'use client'

import { useState, ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'

interface DeleteConfirmDialogProps {
  title: string
  description?: string
  onConfirm: () => void
  isDeleting?: boolean
  isLoading?: boolean
  children?: ReactNode
  // For controlled usage (backward compatibility)
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeleteConfirmDialog({
  title,
  description,
  onConfirm,
  isDeleting = false,
  isLoading = false,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DeleteConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  const loading = isLoading || isDeleting

  const handleConfirm = () => {
    onConfirm()
    // Don't auto-close - let the parent control when to close after deletion completes
  }

  const content = (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>
          {description || `Are you sure you want to delete "${title}"? This action cannot be undone.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault()
            handleConfirm()
          }}
          disabled={loading}
          className={buttonVariants({ variant: 'destructive' })}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )

  // If children provided, use as trigger (uncontrolled)
  if (children) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          {children}
        </AlertDialogTrigger>
        {content}
      </AlertDialog>
    )
  }

  // Otherwise, controlled usage (backward compatibility)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {content}
    </AlertDialog>
  )
}

