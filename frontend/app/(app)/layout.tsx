"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { useAuthContext } from "@/components/auth-provider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading, logout } = useAuthContext()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  function handleLogout() {
    logout()
    router.push("/login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen">
      <Navbar onLogout={handleLogout} />
      <main>{children}</main>
    </div>
  )
}
