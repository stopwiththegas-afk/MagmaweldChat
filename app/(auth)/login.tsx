import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { useT } from '@/i18n';
import { makeLoginStyles } from '@/styles/loginStyles';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) {
    return '+7' + digits.slice(1);
  }
  if (digits.startsWith('7') && digits.length === 11) {
    return '+' + digits;
  }
  return raw;
}

function isValidRussianPhone(phone: string): boolean {
  return /^(\+7|8)\d{10}$/.test(phone.replace(/[\s\-()]/g, ''));
}

export default function LoginScreen() {
  const { sendCode } = useAuth();
  const router = useRouter();
  const { colors } = useSettings();
  const tr = useT();
  const styles = useMemo(() => makeLoginStyles(colors), [colors]);

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleContinue() {
    const cleaned = phone.trim();
    if (!isValidRussianPhone(cleaned)) {
      setError(tr('err_invalid_phone'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await sendCode(normalizePhone(cleaned));
      router.push('/(auth)/verify');
    } catch (e: any) {
      setError(tr('err_generic'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{tr('login_title')}</Text>
          <Text style={styles.subtitle}>{tr('login_subtitle')}</Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder={tr('login_placeholder')}
            placeholderTextColor={colors.subtext}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(v) => { setPhone(v); setError(''); }}
            maxLength={18}
            autoFocus
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{tr('continue_btn')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
