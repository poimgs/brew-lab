import axios, { type AxiosError } from "axios"

const client = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

// Request interceptor: attach access token
client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Response interceptor: handle 401 + refresh
let refreshPromise: Promise<string> | null = null

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      // Deduplicate concurrent refresh calls
      if (!refreshPromise) {
        refreshPromise = client
          .post<{ access_token: string }>("/auth/refresh")
          .then((res) => {
            accessToken = res.data.access_token
            return res.data.access_token
          })
          .catch((refreshError) => {
            accessToken = null
            // Notify auth context about session expiry
            window.dispatchEvent(new Event("auth:session-expired"))
            return Promise.reject(refreshError)
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      try {
        const newToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return client(originalRequest)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default client
