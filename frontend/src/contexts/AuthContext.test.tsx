import { render, screen, waitFor, act } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AuthProvider, useAuth } from "./AuthContext"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { setAccessToken, getAccessToken } from "@/api/client"

// Mock the auth API module
vi.mock("@/api/auth", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}))

// Import mocked functions for control
import { login as apiLogin, logout as apiLogout, refresh as apiRefresh } from "@/api/auth"

const mockedRefresh = vi.mocked(apiRefresh)
const mockedLogin = vi.mocked(apiLogin)
const mockedLogout = vi.mocked(apiLogout)

// Test component that exposes auth context values
function AuthConsumer({ onRender }: { onRender: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth()
  onRender(auth)
  return (
    <div>
      <span data-testid="user">{auth.user?.email ?? "none"}</span>
      <span data-testid="loading">{String(auth.isLoading)}</span>
    </div>
  )
}

function renderWithAuth(onRender: (auth: ReturnType<typeof useAuth>) => void) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthConsumer onRender={onRender} />
      </AuthProvider>
    </MemoryRouter>
  )
}

// Helper to create a JWT-like token with given payload
function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesig`
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAccessToken(null)
  })

  afterEach(() => {
    setAccessToken(null)
  })

  it("starts in loading state and resolves to unauthenticated when refresh fails", async () => {
    mockedRefresh.mockRejectedValueOnce(new Error("no session"))

    const states: { isLoading: boolean; user: unknown }[] = []
    renderWithAuth((auth) => {
      states.push({ isLoading: auth.isLoading, user: auth.user })
    })

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    })

    expect(screen.getByTestId("user")).toHaveTextContent("none")
    expect(getAccessToken()).toBeNull()
  })

  it("restores session from refresh on mount", async () => {
    const token = makeToken({ sub: "user-123", email: "test@example.com" })
    mockedRefresh.mockResolvedValueOnce({ access_token: token })

    renderWithAuth(() => {})

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    })

    expect(screen.getByTestId("user")).toHaveTextContent("test@example.com")
    expect(getAccessToken()).toBe(token)
  })

  it("login sets user and access token", async () => {
    mockedRefresh.mockRejectedValueOnce(new Error("no session"))

    const token = makeToken({ sub: "user-456", email: "brew@coffee.com" })
    mockedLogin.mockResolvedValueOnce({
      user: { id: "user-456", email: "brew@coffee.com", created_at: "2026-01-01T00:00:00Z" },
      access_token: token,
    })

    let authRef: ReturnType<typeof useAuth> | null = null
    renderWithAuth((auth) => {
      authRef = auth
    })

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    })

    // Now call login
    await act(async () => {
      await authRef!.login({ email: "brew@coffee.com", password: "Pass1234!" })
    })

    expect(screen.getByTestId("user")).toHaveTextContent("brew@coffee.com")
    expect(getAccessToken()).toBe(token)
    expect(mockedLogin).toHaveBeenCalledWith({
      email: "brew@coffee.com",
      password: "Pass1234!",
    })
  })

  it("logout clears user and access token", async () => {
    const token = makeToken({ sub: "user-789", email: "logout@test.com" })
    mockedRefresh.mockResolvedValueOnce({ access_token: token })
    mockedLogout.mockResolvedValueOnce(undefined)

    let authRef: ReturnType<typeof useAuth> | null = null
    renderWithAuth((auth) => {
      authRef = auth
    })

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("logout@test.com")
    })

    await act(async () => {
      await authRef!.logout()
    })

    expect(screen.getByTestId("user")).toHaveTextContent("none")
    expect(getAccessToken()).toBeNull()
  })

  it("logout clears state even if API call fails", async () => {
    const token = makeToken({ sub: "user-000", email: "fail@test.com" })
    mockedRefresh.mockResolvedValueOnce({ access_token: token })
    mockedLogout.mockRejectedValueOnce(new Error("network error"))

    let authRef: ReturnType<typeof useAuth> | null = null
    renderWithAuth((auth) => {
      authRef = auth
    })

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("fail@test.com")
    })

    await act(async () => {
      try {
        await authRef!.logout()
      } catch {
        // Expected — API call fails but state should still be cleared
      }
    })

    expect(screen.getByTestId("user")).toHaveTextContent("none")
    expect(getAccessToken()).toBeNull()
  })

  it("session-expired event clears user", async () => {
    const token = makeToken({ sub: "user-exp", email: "expired@test.com" })
    mockedRefresh.mockResolvedValueOnce({ access_token: token })

    renderWithAuth(() => {})

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("expired@test.com")
    })

    act(() => {
      window.dispatchEvent(new Event("auth:session-expired"))
    })

    expect(screen.getByTestId("user")).toHaveTextContent("none")
    expect(getAccessToken()).toBeNull()
  })

  it("throws if useAuth is used outside AuthProvider", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    function Orphan() {
      useAuth()
      return null
    }

    expect(() => render(<Orphan />)).toThrow(
      "useAuth must be used within an AuthProvider"
    )

    consoleSpy.mockRestore()
  })
})
