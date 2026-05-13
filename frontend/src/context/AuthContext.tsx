import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface RegisteredEvent {
  eventName: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  registeredAt: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  userType: 'student' | 'working';
  collegeName?: string;
  course?: string;
  year?: string;
  domain?: string;
  organization?: string;
  needsAdminReview?: boolean;
  reviewStatus?: 'not_required' | 'pending' | 'approved';
  registeredEvents: RegisteredEvent[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lwai_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('lwai_user');
    try { return stored ? JSON.parse(stored) : null; } catch { return null; }
  });

  function login(newToken: string, newUser: AuthUser) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('lwai_token', newToken);
    localStorage.setItem('lwai_user', JSON.stringify(newUser));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lwai_token');
    localStorage.removeItem('lwai_user');
  }

  function updateUser(updatedUser: AuthUser) {
    setUser(updatedUser);
    localStorage.setItem('lwai_user', JSON.stringify(updatedUser));
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
