"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";
import { ApiResponse, User, Patient } from "@/types";

interface AuthUser extends User {
  phone?: string | null;
  createdAt: string;
  patient?: {
    id: string;
    age: number;
    gender: string;
    bloodGroup?: string | null;
    address?: string | null;
    allergies: string[];
    chronicConditions: string[];
  } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, role: string) => Promise<void>;
  register: (data: PatientRegisterData) => Promise<void>;
  logout: () => void;
}

export interface PatientRegisterData {
  email: string;
  password: string;
  name: string;
  age: number;
  gender: string;
  phone?: string;
  bloodGroup?: string;
  address?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "smarthealth_token";
const USER_KEY = "smarthealth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const saveAuth = useCallback((userData: AuthUser, tokenValue: string) => {
    setUser(userData);
    setToken(tokenValue);
    localStorage.setItem(TOKEN_KEY, tokenValue);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }, []);

  const login = useCallback(async (email: string, password: string, role: string) => {
    const res = await api.post<ApiResponse<{ user: AuthUser; token: string }>>(
      `/${role}/login`,
      { email, password },
    );
    if (!res.success || !res.data) throw new Error(res.error || "Login failed");
    saveAuth(res.data.user, res.data.token);
  }, [saveAuth]);

  const register = useCallback(async (data: PatientRegisterData) => {
    const res = await api.post<ApiResponse<{ user: AuthUser; token: string }>>(
      "/patient/register",
      data,
    );
    if (!res.success || !res.data) throw new Error(res.error || "Registration failed");
    saveAuth(res.data.user, res.data.token);
  }, [saveAuth]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
