// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'sysadmin' | 'super_admin' | 'admin' | 'auditor' | 'operator';
  tenantId?: string;
  companyName: string;
  allowedProjectIds?: string[];
  permissions?: {
    canUseBuilder?: boolean;
    canExportReports?: boolean;
    canManageUsers?: boolean;
    canUseCustomCode?: boolean;
  };
}

interface AuthContextType {
  user: UserSession | null;
  login: (userData: UserSession) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('nws_auth_session');
        if (raw) {
          setUser(JSON.parse(raw));
        } else {
          setUser(null);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: UserSession) => {
    setUser(userData);
    setIsLoading(false);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nws_auth_session', JSON.stringify(userData));
      sessionStorage.setItem('nws_current_session', JSON.stringify(userData));
    }

    if (userData.role === 'sysadmin') {
      window.location.href = '/sysadmin';
    } else if (userData.role === 'auditor') {
      window.location.href = '/reports';
    } else {
      window.location.href = '/';
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);