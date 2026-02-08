import client from "./client"

export interface User {
  id: string
  email: string
  created_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  access_token: string
}

export interface RefreshResponse {
  access_token: string
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await client.post<LoginResponse>("/auth/login", data)
  return res.data
}

export async function refresh(): Promise<RefreshResponse> {
  const res = await client.post<RefreshResponse>("/auth/refresh")
  return res.data
}

export async function logout(): Promise<void> {
  await client.post("/auth/logout")
}

export async function getMe(): Promise<User> {
  const res = await client.get<User>("/auth/me")
  return res.data
}
