import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api, setToken as saveToken, removeToken } from "../lib/api";
import { ApiResponse, AuthUser, PatientRegisterData } from "../types";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, role: string) => Promise<void>;
  register: (data: PatientRegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "smarthealth_token";
const USER_KEY = "smarthealth_user";

async function loadStored(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function saveStored(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeStored(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const savedToken = await loadStored(TOKEN_KEY);
      const savedUser = await loadStored(USER_KEY);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    })();
  }, []);

  const persistAuth = useCallback(async (userData: AuthUser, tokenValue: string) => {
    setUser(userData);
    setToken(tokenValue);
    await saveToken(tokenValue);
    await saveStored(USER_KEY, JSON.stringify(userData));
  }, []);

  const login = useCallback(async (email: string, password: string, role: string) => {
    const res = await api.post<ApiResponse<{ user: AuthUser; token: string }>>(
      `/${role}/login`,
      { email, password },
    );
    if (!res.success || !res.data) throw new Error(res.error || "Login failed");
    await persistAuth(res.data.user, res.data.token);
  }, [persistAuth]);

  const register = useCallback(async (data: PatientRegisterData) => {
    const res = await api.post<ApiResponse<{ user: AuthUser; token: string }>>(
      "/patient/register",
      data,
    );
    if (!res.success || !res.data) throw new Error(res.error || "Registration failed");
    await persistAuth(res.data.user, res.data.token);
  }, [persistAuth]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await removeToken();
    await removeStored(USER_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
