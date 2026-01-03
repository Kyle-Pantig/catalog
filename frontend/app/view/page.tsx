'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ViewPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isAccessing, setIsAccessing] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code) {
      setIsAccessing(true)
      router.push(`/view/${code.toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-2">
            <Image
              src="/catalink-logo.png"
              alt="Catalink Logo"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="text-center space-y-2">
            <CardDescription className="text-base">Enter your share code to access the catalog</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter share code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="text-center text-lg font-mono tracking-wider"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isAccessing}>
              {isAccessing ? (
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

