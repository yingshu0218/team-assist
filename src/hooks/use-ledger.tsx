"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Ledger } from "@/lib/types";
import { authHeaders } from "@/hooks/use-data";

interface LedgerContextValue {
  ledgers: Ledger[];
  activeLedger: Ledger | null;
  activeLedgerId: number | null;
  setActiveLedgerId: (id: number) => void;
  refreshLedgers: () => Promise<void>;
  loading: boolean;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

const STORAGE_KEY = "active_ledger_id";

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [activeLedgerId, setActiveLedgerIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureDefaultLedger = useCallback(async () => {
    // 如果没有任何账本，自动创建默认账本
    try {
      const res = await fetch("/api/ledgers", { headers: authHeaders() });
      const json = await res.json();
      if (json.success && json.data && json.data.length === 0) {
        const createRes = await fetch("/api/ledgers", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name: "默认账本", description: "系统自动创建的默认账本" }),
        });
        const createJson = await createRes.json();
        if (createJson.success && createJson.data) {
          return createJson.data.id as number;
        }
      }
    } catch {
      // 静默处理
    }
    return null;
  }, []);

  const refreshLedgers = useCallback(async () => {
    try {
      const res = await fetch("/api/ledgers", { headers: authHeaders() });
      const json = await res.json();
      if (json.success && json.data) {
        let ledgerData = json.data;

        // 无账本时自动创建默认账本
        if (ledgerData.length === 0) {
          const defaultId = await ensureDefaultLedger();
          if (defaultId) {
            // 重新拉取
            const res2 = await fetch("/api/ledgers", { headers: authHeaders() });
            const json2 = await res2.json();
            if (json2.success && json2.data) {
              ledgerData = json2.data;
            }
          }
        }

        setLedgers(ledgerData);

        if (ledgerData.length > 0) {
          const stored = typeof window !== "undefined"
            ? parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10)
            : 0;
          const exists = ledgerData.find((l: Ledger) => l.id === stored);
          if (exists) {
            setActiveLedgerIdState(exists.id);
          } else {
            setActiveLedgerIdState(ledgerData[0].id);
          }
        } else {
          setActiveLedgerIdState(null);
        }
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, [ensureDefaultLedger]);

  const setActiveLedgerId = useCallback((id: number) => {
    setActiveLedgerIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  }, []);

  const activeLedger = ledgers.find((l) => l.id === activeLedgerId) || null;

  useEffect(() => {
    refreshLedgers();
  }, [refreshLedgers]);

  return (
    <LedgerContext.Provider
      value={{
        ledgers,
        activeLedger,
        activeLedgerId,
        setActiveLedgerId,
        refreshLedgers,
        loading,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}
