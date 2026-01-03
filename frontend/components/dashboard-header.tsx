'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth'
import { toast } from 'sonner'

interface DashboardHeaderProps {
  title: string
  description?: string
  backButton?: {
    href: string
    label: string
  }
  children?: React.ReactNode
}

export function DashboardHeader({ title, description, backButton, children }: DashboardHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        {backButton && (
          <Link href={backButton.href} className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full sm:w-auto">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {backButton.label}
            </Button>
          </Link>
        )}
        {children}
        <Button variant="outline" onClick={handleLogout} className="flex-1 sm:flex-initial">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </Button>
      </div>
    </div>
  )
}

