import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  login as apiLogin,
  logout as apiLogout,
  refresh as apiRefresh,
  type LoginRequest,
  type User,
} from "@/api/auth"
import { setAccessToken } from "@/api/client"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on mount by trying to refresh
  useEffect(() => {
    apiRefresh()
      .then((res) => {
        setAccessToken(res.access_token)
        // Decode user from the JWT payload (sub + email are in the access token)
        const payload = JSON.parse(atob(res.access_token.split(".")[1]))
        setUser({ id: payload.sub, email: payload.email, created_at: "" })
      })
      .catch(() => {
        setAccessToken(null)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  // Listen for session expiry events from the interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      setAccessToken(null)
    }
    window.addEventListener("auth:session-expired", handleSessionExpired)
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired)
    }
  }, [])

  const login = useCallback(async (data: LoginRequest) => {
    const res = await apiLogin(data)
    setAccessToken(res.access_token)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
