"use client";

import { useState, useEffect, useCallback } from "react";

interface UseFetchOptions {
  enabled?: boolean;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// 获取存储的 auth token
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

// 构建带认证的 headers
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// 通用数据获取 hook
export function useFetch<T>(url: string | null, options: UseFetchOptions = {}): UseFetchResult<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
    return Promise.resolve();
  }, []);

  useEffect(() => {
    if (!url || !enabled) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const headers = authHeaders();

    fetch(url, { headers })
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "请求失败");
          setData(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "网络错误");
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, enabled, refetchKey]);

  return { data, loading, error, refetch };
}

// POST/PUT/DELETE 辅助函数
export async function apiPost<T>(url: string, body: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiPut<T>(url: string, body: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiDelete(url: string, body?: unknown): Promise<{ success: boolean; error?: string }> {
  const options: RequestInit = {
    method: "DELETE",
    headers: authHeaders(body ? { "Content-Type": "application/json" } : undefined),
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  return res.json();
}
