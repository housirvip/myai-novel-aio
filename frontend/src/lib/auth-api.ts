import { apiGet, apiPost } from "@/lib/api";
import type { AuthLoginResponse, AuthSessionView, LoginInput, RegisterInput } from "@/lib/types";

export function getSession() {
  return apiGet<AuthSessionView>("/api/auth/session");
}

export async function login(input: LoginInput) {
  const res = await apiPost<AuthLoginResponse, LoginInput>("/api/auth/login", input);
  if (res.token) {
    localStorage.setItem("auth-token", res.token);
  }
  return res.user;
}

export async function register(input: RegisterInput) {
  const res = await apiPost<AuthLoginResponse, RegisterInput>("/api/auth/register", input);
  if (res.token) {
    localStorage.setItem("auth-token", res.token);
  }
  return res.user;
}

export async function logout() {
  try {
    await apiPost<{ ok: true }, Record<string, never>>("/api/auth/logout", {});
  } finally {
    localStorage.removeItem("auth-token");
  }
}
