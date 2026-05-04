import { apiClient } from "@/lib/apiClient";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserOut {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  avatar_color: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserOut;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>("/auth/login", payload);
    return data;
  },

  me: async (): Promise<UserOut> => {
    const { data } = await apiClient.get<UserOut>("/auth/me");
    return data;
  },

  register: async (payload: {
    name: string;
    email: string;
    password: string;
    role?: "admin" | "agent";
    avatar_color?: string;
  }): Promise<UserOut> => {
    const { data } = await apiClient.post<UserOut>("/auth/register", payload);
    return data;
  },
};
