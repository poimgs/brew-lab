const API_BASE = "/api/v1";

export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export interface LoginResponse {
  data: {
    user: User;
    access_token: string;
  };
}

export interface RefreshResponse {
  data: {
    access_token: string;
  };
}

export interface MeResponse {
  data: User;
}

export interface ApiError {
  error: string;
  message?: string;
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: "Request failed",
      }));
      throw new Error(error.message || error.error || "Request failed");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.accessToken = response.data.access_token;
    return response;
  }

  async logout(): Promise<void> {
    await this.request<void>("/auth/logout", {
      method: "POST",
    });
    this.accessToken = null;
  }

  async refreshToken(): Promise<RefreshResponse> {
    const response = await this.request<RefreshResponse>("/auth/refresh", {
      method: "POST",
    });
    this.accessToken = response.data.access_token;
    return response;
  }

  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>("/auth/me");
  }
}

export const api = new ApiClient();
