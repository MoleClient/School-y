import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialDiscord: string | null;
  createdAt: string;
  timedOutUntil: string | null;
  trolled?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  kicked: boolean;
  trolled: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => void;
  clearKicked: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_CHECK_INTERVAL = 2000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [kicked, setKicked] = useState(false);
  const [trolled, setTrolled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMe = useCallback(async (): Promise<"ok" | "unauthorized" | "error"> => {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      if (r.ok) {
        const u = await r.json();
        setUser(u);
        if (u.trolled) setTrolled(true);
        return "ok";
      } else if (r.status === 401 || r.status === 403) {
        setUser(null);
        return "unauthorized";
      } else {
        return "error";
      }
    } catch {
      return "error";
    }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [fetchMe]);

  useEffect(() => {
    if (user && !kicked) {
      intervalRef.current = setInterval(async () => {
        const result = await fetchMe();
        if (result === "unauthorized") {
          setKicked(true);
          setUser(null);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, SESSION_CHECK_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, kicked, fetchMe]);

  const refreshUser = async () => {
    await fetchMe();
  };

  const updateUser = (data: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...data } : prev);
  };

  const clearKicked = () => setKicked(false);

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setKicked(false);
    setUser(data);
    queryClient.invalidateQueries({ queryKey: ["/api/user/history"] });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setKicked(false);
    queryClient.invalidateQueries({ queryKey: ["/api/user/history"] });
  };

  return (
    <AuthContext.Provider value={{ user, loading, kicked, trolled, login, logout, refreshUser, updateUser, clearKicked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
