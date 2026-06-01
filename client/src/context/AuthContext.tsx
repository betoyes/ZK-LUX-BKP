import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { fetchCsrfToken, clearCsrfToken } from '@/lib/csrf';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'customer';
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    await fetchCsrfToken();
    await checkAuth();
  };

  const checkAuth = async () => {
    try {
      const data = await api.auth.me();
      if ('id' in data && 'role' in data) {
        setUser(data as User);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<User> => {
    // Ensure a fresh CSRF token before logging in. The in-memory token can be
    // stale (cleared on logout, expired after 2h, or reused by an old tab),
    // which previously made login fail with "Token CSRF inválido" until the
    // page was reloaded. api.request() also retries once on a 403 CSRF error.
    await fetchCsrfToken();
    const data = await api.auth.login(username, password);
    const userData = data as User;
    setUser(userData);
    await fetchCsrfToken();
    return userData;
  };

  const logout = async () => {
    // Refresh the CSRF token from the current session right before logging out.
    // The in-memory token captured at login time can drift out of sync with
    // req.session.csrfToken (e.g. across navigation/reloads), and csrfProtection
    // on POST /api/auth/logout rejects a stale token with 403 — which left the
    // user logged in with "Não foi possível desconectar". Fetching it here
    // guarantees the x-csrf-token header matches the session token.
    await fetchCsrfToken();
    await api.auth.logout();
    clearCsrfToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
