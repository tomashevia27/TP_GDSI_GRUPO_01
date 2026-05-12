"use client"

import { useState, useEffect, useCallback } from "react"

const AUTH_SESSION_KEY = "teamup_auth_user_id"

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUserId = sessionStorage.getItem(AUTH_SESSION_KEY)
    setUserId(storedUserId)
    setIsLoading(false)
  }, [])

  const login = useCallback((id: string) => {
    sessionStorage.setItem(AUTH_SESSION_KEY, String(id))
    setUserId(String(id))
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    setUserId(null)
  }, [])

  const isAuthenticated = userId !== null

  return {
    userId,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }
}
