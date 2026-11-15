import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../lib/api.js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'ADMISSIONS_COUNSELLOR' | 'ACADEMIC_COORDINATOR' | 'TEACHER';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLoginAs: (role: 'ADMIN' | 'COUNSELLOR' | 'COORDINATOR' | 'TEACHER') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    fetchApi<{ success: boolean; user: User }>('/api/auth/me')
      .then((res) => {
        if (res.user) setUser(res.user);
      })
      .catch(() => {
        // Fallback default demo user if unauthenticated
        const saved = localStorage.getItem('teamb_user');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch {}
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password = 'Password123!') => {
    setIsLoading(true);
    try {
      const res = await fetchApi<{ success: boolean; user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(res.user);
      if (res.token) localStorage.setItem('teamb_token', res.token);
      localStorage.setItem('teamb_user', JSON.stringify(res.user));
    } catch (err: any) {
      // Offline / standalone demo fallback when backend is not running or not yet deployed
      const isNetworkDown = !err?.status || err.message?.includes('fetch') || err.message?.includes('Failed') || err.message?.includes('NetworkError');
      if (isNetworkDown) {
        const demoAccounts: Record<string, { role: User['role']; name: string }> = {
          'admin@teamb.edu': { role: 'ADMIN', name: 'Dr. Vikramaditya Sharma (Director)' },
          'counsellor.priya@teamb.edu': { role: 'ADMISSIONS_COUNSELLOR', name: 'Priya Sharma (Senior Counsellor)' },
          'coordinator.rahul@teamb.edu': { role: 'ACADEMIC_COORDINATOR', name: 'Rahul Varma (Senior Coordinator)' },
          'teacher.anita@teamb.edu': { role: 'TEACHER', name: 'Anita Desai (Senior Faculty)' },
        };
        const normalized = email.toLowerCase().trim();
        const demoUser = demoAccounts[normalized];
        if (demoUser) {
          const fallbackUser: User = {
            id: `demo-${demoUser.role.toLowerCase()}`,
            email: normalized,
            name: demoUser.name,
            role: demoUser.role,
          };
          setUser(fallbackUser);
          localStorage.setItem('teamb_user', JSON.stringify(fallbackUser));
          localStorage.setItem('teamb_token', 'demo-offline-preview-token');
          return;
        }
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    localStorage.removeItem('teamb_token');
    localStorage.removeItem('teamb_user');
  };

  const quickLoginAs = async (role: 'ADMIN' | 'COUNSELLOR' | 'COORDINATOR' | 'TEACHER') => {
    const creds = {
      ADMIN: { email: 'admin@teamb.edu', password: 'AdminPass123!' },
      COUNSELLOR: { email: 'counsellor.priya@teamb.edu', password: 'Counsellor123!' },
      COORDINATOR: { email: 'coordinator.rahul@teamb.edu', password: 'Coordinator123!' },
      TEACHER: { email: 'teacher.anita@teamb.edu', password: 'Teacher123!' },
    }[role];

    await login(creds.email, creds.password);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, quickLoginAs }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
