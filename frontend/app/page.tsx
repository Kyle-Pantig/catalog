'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl w-full space-y-12 text-center">
        <div className="space-y-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/catalink-logo.png"
              alt="Catalink Logo"
              width={200}
              height={67}
              className="h-16 w-auto object-contain"
            />
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Share your product catalogs securely with share codes. 
            <span className="block mt-2 text-lg">Professional catalog management made simple.</span>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-colors shadow-lg">
            <CardHeader className="space-y-2">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <CardTitle className="text-2xl">Catalog Owner</CardTitle>
              <CardDescription className="text-base">
                Create, manage, and share your product catalogs with secure access codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Button className="w-full" size="lg" disabled>Loading...</Button>
              ) : isAuthenticated ? (
                <Link href="/dashboard">
                  <Button className="w-full" size="lg">Dashboard</Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button className="w-full" size="lg">Sign In</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors shadow-lg">
            <CardHeader className="space-y-2">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <CardTitle className="text-2xl">Viewer</CardTitle>
              <CardDescription className="text-base">
                Access catalogs using a secure share code provided by the catalog owner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/view">
                <Button variant="outline" className="w-full" size="lg">Enter Share Code</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          <p>Secure • Private • Professional</p>
        </div>
      </div>
    </div>
  )
}
