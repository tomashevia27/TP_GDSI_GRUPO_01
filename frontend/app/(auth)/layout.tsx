"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/components/auth-provider"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthContext()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/home")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  return <>{children}</>
}
