"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface AuthState {
  authenticated: boolean;
  initialized: boolean;
  type: "session" | "agent" | "none";
  identity: string | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  initAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    initialized: false,
    type: "none",
    identity: null,
    token: null,
    loading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        // 检查是否已初始化
        const checkRes = await fetch("/api/auth/check");
        const checkData = await checkRes.json();
        setState({
          authenticated: false,
          initialized: checkData.data?.initialized ?? false,
          type: "none",
          identity: null,
          token: null,
          loading: false,
        });
        return;
      }

      const res = await fetch("/api/auth/check", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success && data.data.authenticated) {
        setState({
          authenticated: true,
          initialized: true,
          type: data.data.type,
          identity: data.data.identity,
          token,
          loading: false,
        });
      } else {
        localStorage.removeItem("admin_token");
        setState({
          authenticated: false,
          initialized: data.data?.initialized ?? true,
          type: "none",
          identity: null,
          token: null,
          loading: false,
        });
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("admin_token", data.data.token);
        setState({
          authenticated: true,
          initialized: true,
          type: "session",
          identity: data.data.username,
          token: data.data.token,
          loading: false,
        });
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "登录失败" };
    }
  };

  const initAdmin = async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        // 初始化后自动登录
        return await login(username, password);
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "初始化失败" };
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setState({
      authenticated: false,
      initialized: true,
      type: "none",
      identity: null,
      token: null,
      loading: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        initAdmin,
        logout,
        refetch: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
