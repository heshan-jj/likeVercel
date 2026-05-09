import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../utils/api';

interface User {
  id: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSetup: boolean;
  login: (token: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  checkSetupStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);

  const checkSetupStatus = useCallback(async () => {
    try {
      const res = await api.get('/auth/status');
      setIsSetup(res.data.isSetup);
    } catch (error) {
      console.error('Failed to check setup status', error);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      await checkSetupStatus();
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch {
        // Not authenticated - that's ok
      }
      setLoading(false);
    };

    initAuth();
  }, [checkSetupStatus]);

  const login = (_token: string, _refreshToken: string, userData: User) => {
    setUser(userData);
    setIsSetup(true);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Server-side revocation is best-effort
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isSetup, login, logout, checkSetupStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};