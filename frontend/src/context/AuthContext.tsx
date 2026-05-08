import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const checkSetupStatus = async () => {
    try {
      const res = await api.get('/auth/status');
      setIsSetup(res.data.isSetup);
    } catch (error) {
      console.error('Failed to check setup status', error);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await checkSetupStatus();
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const payloadParts = token.split('.');
          if (payloadParts.length === 3) {
            const payload = JSON.parse(atob(payloadParts[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
              throw new Error('Token expired');
            }
          }

          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (error) {
          console.error('Auth verification failed', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, refreshToken: string, userData: User) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    setIsSetup(true);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Server-side revocation is best-effort
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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