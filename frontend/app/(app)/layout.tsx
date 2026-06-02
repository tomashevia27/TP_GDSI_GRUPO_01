"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { useAuthContext } from "@/components/auth-provider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading, logout } = useAuthContext()

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoggingOut) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router, isLoggingOut])

  function handleLogout() {
    setIsLoggingOut(true)
    logout()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar onLogout={handleLogout} />
      <main className="pt-16">{children}</main>
    </div>
  )
}
