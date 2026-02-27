import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Language, Theme, useSettings } from '@/context/settings';
import { TranslationKey, useT } from '@/i18n';
import { makeSettingsStyles } from '@/styles/settingsStyles';

const LANGUAGES: Language[] = ['ru', 'en', 'tr'];
const THEMES: Theme[] = ['light', 'dark'];

const LANGUAGE_SYMBOLS: Record<Language, string> = {
  ru: 'Ру',
  en: 'En',
  tr: 'Tü',
};

const LANGUAGE_KEYS: Record<Language, TranslationKey> = {
  ru: 'lang_ru',
  en: 'lang_en',
  tr: 'lang_tr',
};

const THEME_ICONS: Record<Theme, keyof typeof Ionicons.glyphMap> = {
  light: 'sunny-outline',
  dark: 'moon-outline',
};

const THEME_KEYS: Record<Theme, TranslationKey> = {
  light: 'theme_light',
  dark: 'theme_dark',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { language, theme, colors, setLanguage, setTheme } = useSettings();
  const tr = useT();
  const s = useMemo(() => makeSettingsStyles(colors), [colors]);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{tr('settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>{tr('language')}</Text>
        <View style={s.card}>
          {LANGUAGES.map((lang, i) => (
            <View key={lang}>
              <TouchableOpacity style={s.optionRow} activeOpacity={0.7} onPress={() => setLanguage(lang)}>
                <Text style={s.langSymbol}>{LANGUAGE_SYMBOLS[lang]}</Text>
                <Text style={s.optionLabel}>{tr(LANGUAGE_KEYS[lang])}</Text>
                <View style={s.radioOuter}>
                  {language === lang && <View style={s.radioInner} />}
                </View>
              </TouchableOpacity>
              {i < LANGUAGES.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>{tr('theme')}</Text>
        <View style={s.card}>
          {THEMES.map((thm, i) => (
            <View key={thm}>
              <TouchableOpacity style={s.optionRow} activeOpacity={0.7} onPress={() => setTheme(thm)}>
                <View style={s.optionIcon}>
                  <Ionicons name={THEME_ICONS[thm]} size={20} color={colors.accent} />
                </View>
                <Text style={s.optionLabel}>{tr(THEME_KEYS[thm])}</Text>
                <View style={s.radioOuter}>
                  {theme === thm && <View style={s.radioInner} />}
                </View>
              </TouchableOpacity>
              {i < THEMES.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
