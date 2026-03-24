import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  isAuthenticated: boolean;
  isDeveloper: boolean;
  userChatId: number | null;
  userId: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithPassword: (password: string) => boolean;
  register: (email: string, password: string, linkCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const DEV_PASSWORD = "shady2026admin";
const AUTH_KEY = "shady_dashboard_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [userChatId, setUserChatId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check dev session
    const saved = sessionStorage.getItem(AUTH_KEY);
    if (saved === "dev") {
      setIsAuthenticated(true);
      setIsDeveloper(true);
      return;
    }

    // Check Supabase session
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserId(session.user.id);
        loadUserChatId(session.user.id);
      }
    });

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserId(session.user.id);
        loadUserChatId(session.user.id);
      } else if (sessionStorage.getItem(AUTH_KEY) !== "dev") {
        setIsAuthenticated(false);
        setUserChatId(null);
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserChatId(uid: string) {
    const { data } = await supabase.from("dashboard_users" as any)
      .select("chat_id, is_developer")
      .eq("user_id", uid)
      .single();
    if (data) {
      setUserChatId((data as any).chat_id);
      setIsDeveloper((data as any).is_developer || false);
    }
  }

  const loginWithPassword = (password: string) => {
    if (password === DEV_PASSWORD) {
      setIsAuthenticated(true);
      setIsDeveloper(true);
      sessionStorage.setItem(AUTH_KEY, "dev");
      return true;
    }
    return false;
  };

  const login = async (email: string, password: string) => {
    const { error } = await (supabase.auth as any).signInWithPassword({ email, password });
    if (error) return false;
    return true;
  };

  const register = async (email: string, password: string, linkCode: string): Promise<{ success: boolean; error?: string }> => {
    // First sign up
    const { data: authData, error: authError } = await (supabase.auth as any).signUp({ email, password });
    if (authError) return { success: false, error: authError.message };
    if (!authData.user) return { success: false, error: "فشل إنشاء الحساب" };

    // Verify link code via edge function
    const { data: linkData, error: linkError } = await supabase.functions.invoke("telegram-bot", {
      body: { action: "verify_link_code", code: linkCode, user_id: authData.user.id, display_name: email.split("@")[0] },
    });

    if (linkError || !linkData?.ok) {
      return { success: false, error: linkData?.error || "رمز الربط غير صالح" };
    }

    return { success: true };
  };

  const logout = () => {
    supabase.auth.signOut();
    setIsAuthenticated(false);
    setIsDeveloper(false);
    setUserChatId(null);
    setUserId(null);
    sessionStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isDeveloper, userChatId, userId, login, loginWithPassword, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
