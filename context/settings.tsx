import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Language = 'ru' | 'en' | 'tr';
export type Theme = 'light' | 'dark';


export const lightColors = {
  background: '#cadded',
  card: '#cadded',
  bubble: '#ffffff',
  text: '#1a1a2e',
  subtext: '#7a9bbf',
  accent: '#1565c0',
  divider: '#e8f0f8',
  headerBg: '#cadded',
  sectionLabel: '#4a6fa5',
  // auth screens
  authBackground: '#f0f6fb',
  inputBg: '#ffffff',
  inputBorder: '#d0dce8',
  subtitleText: '#555555',
  labelText: '#555555',
  // drawer
  drawerBg: '#cadded',
  drawerDivider: '#a8c8e0',
  drawerItemText: '#1a1a2e',
  closeIcon: '#1a1a2e',
};

export const darkColors = {
  background: '#0f1624',
  card: '#0f1624',
  bubble: '#1a2535',
  text: '#e8f0ff',
  subtext: '#7a9bbf',
  accent: '#4d8fcc',
  divider: '#243040',
  headerBg: '#0f1624',
  sectionLabel: '#7ab3d4',
  // auth screens
  authBackground: '#0d1520',
  inputBg: '#1a2535',
  inputBorder: '#2a3a50',
  subtitleText: '#8a9bbf',
  labelText: '#8a9bbf',
  // drawer
  drawerBg: '#1a2535',
  drawerDivider: '#2a3a50',
  drawerItemText: '#e8f0ff',
  closeIcon: '#e8f0ff',
};

export type AppColors = typeof lightColors;

interface SettingsContextValue {
  language: Language;
  theme: Theme;
  colors: AppColors;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
}

const SETTINGS_KEY = 'app_settings';

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.language) setLanguageState(saved.language);
          if (saved.theme) setThemeState(saved.theme);
        }
      } catch {}
    })();
  }, []);

  const save = useCallback(async (lang: Language, thm: Theme) => {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ language: lang, theme: thm }));
  }, []);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      save(lang, theme);
    },
    [theme, save],
  );

  const setTheme = useCallback(
    (thm: Theme) => {
      setThemeState(thm);
      save(language, thm);
    },
    [language, save],
  );

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <SettingsContext.Provider value={{ language, theme, colors, setLanguage, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
