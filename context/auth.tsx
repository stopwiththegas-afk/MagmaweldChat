import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { User, userService } from '@/services/userService';

const SESSION_KEY = 'db_session';
const MOCK_CODE = '1234';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const session = await AsyncStorage.getItem(SESSION_KEY);
        if (session) {
          const { userId } = JSON.parse(session);
          const found = await userService.getById(userId);
          if (found) setUser(found);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const sendCode = useCallback(async (phone: string) => {
    // В будущем: вызов SMS-сервиса (Firebase / другой провайдер)
    setPendingPhone(phone);
  }, []);

  const verifyCode = useCallback(async (code: string): Promise<'existing' | 'new'> => {
    if (code !== MOCK_CODE) throw new Error('err_wrong_code');
    if (!pendingPhone) throw new Error('err_no_phone');

    const existing = await userService.getByPhone(pendingPhone);
    if (existing) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: existing.id }));
      setUser(existing);
      return 'existing';
    }
    return 'new';
  }, [pendingPhone]);

  const register = useCallback(async (username: string, displayName: string) => {
    if (!pendingPhone) throw new Error('err_no_phone');

    const taken = await userService.getByUsername(username);
    if (taken) throw new Error('err_username_taken');

    const newUser = await userService.create({ phone: pendingPhone, username, displayName });
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: newUser.id }));
    setUser(newUser);
    setPendingPhone(null);
  }, [pendingPhone]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
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
