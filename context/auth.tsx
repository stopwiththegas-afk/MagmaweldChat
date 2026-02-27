import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { api, clearToken, getToken, setToken } from '@/services/api';
import { socketService } from '@/services/socketService';
import { User } from '@/services/userService';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  pendingPhone: string | null;
  sendCode: (phone: string) => Promise<void>;
  verifyCode: (code: string) => Promise<'existing' | 'new'>;
  register: (username: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PENDING_PHONE_KEY = 'pending_phone';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const data = await api.get<{ user: User }>('/auth/me');
          setUser(data.user);
          socketService.connect(data.user.id);
        }
        const stored = await AsyncStorage.getItem(PENDING_PHONE_KEY);
        if (stored) setPendingPhone(stored);
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const sendCode = useCallback(async (phone: string) => {
    await api.post('/auth/send-code', { phone }, false);
    setPendingPhone(phone);
    await AsyncStorage.setItem(PENDING_PHONE_KEY, phone);
  }, []);

  const verifyCode = useCallback(async (code: string): Promise<'existing' | 'new'> => {
    if (!pendingPhone) throw new Error('err_no_phone');
    const data = await api.post<{ status: 'existing' | 'new'; token?: string; user?: User }>(
      '/auth/verify-code',
      { phone: pendingPhone, code },
      false
    );
    if (data.status === 'existing' && data.token && data.user) {
      await setToken(data.token);
      setUser(data.user);
      socketService.connect(data.user.id);
      await AsyncStorage.removeItem(PENDING_PHONE_KEY);
      setPendingPhone(null);
    }
    return data.status;
  }, [pendingPhone]);

  const register = useCallback(async (username: string, displayName: string) => {
    if (!pendingPhone) throw new Error('err_no_phone');
    const data = await api.post<{ token: string; user: User }>(
      '/auth/register',
      { phone: pendingPhone, username, displayName },
      false
    );
    await setToken(data.token);
    setUser(data.user);
    socketService.connect(data.user.id);
    await AsyncStorage.removeItem(PENDING_PHONE_KEY);
    setPendingPhone(null);
  }, [pendingPhone]);

  const logout = useCallback(async () => {
    socketService.disconnect();
    await clearToken();
    setUser(null);
    router.replace('/(auth)/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, pendingPhone, sendCode, verifyCode, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
