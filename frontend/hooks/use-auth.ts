"use client"

import { useState, useEffect, useCallback } from "react"

const AUTH_SESSION_KEY = "teamup_auth_user_id"
const AUTH_ROLE_KEY = "teamup_auth_user_role"

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUserId = sessionStorage.getItem(AUTH_SESSION_KEY)
    const storedRole = sessionStorage.getItem(AUTH_ROLE_KEY)
    setUserId(storedUserId)
    setRole(storedRole)
    setIsLoading(false)
  }, [])

  const login = useCallback((id: string, userRole: string) => {
    sessionStorage.setItem(AUTH_SESSION_KEY, String(id))
    sessionStorage.setItem(AUTH_ROLE_KEY, userRole)
    setUserId(String(id))
    setRole(userRole)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    sessionStorage.removeItem(AUTH_ROLE_KEY)
    setUserId(null)
    setRole(null)
  }, [])

  const isAuthenticated = userId !== null

  return {
    userId,
    role,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }
}
