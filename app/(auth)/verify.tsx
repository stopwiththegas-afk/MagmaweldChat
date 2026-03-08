import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { TranslationKey, useT } from '@/i18n';
import { makeVerifyStyles } from '@/styles/verifyStyles';

export default function VerifyScreen() {
  const { verifyCode, pendingPhone } = useAuth();
  const router = useRouter();
  const { colors } = useSettings();
  const tr = useT();
  const styles = useMemo(() => makeVerifyStyles(colors), [colors]);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  async function handleVerify() {
    if (code.length < 4) {
      setError(tr('err_code_length'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const result = await verifyCode(code);
      if (result === 'new') {
        router.push('/(auth)/register');
      }
    } catch (e: any) {
      const key = e.message as TranslationKey;
      setError(tr(key) ?? tr('err_generic'));
      setCode('');
      inputRef.current?.focus();
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
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>{tr('back')}</Text>
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{tr('verify_title')}</Text>
          <Text style={styles.subtitle}>
            {tr('verify_subtitle')}{'\n'}
            <Text style={styles.phone}>{pendingPhone}</Text>
          </Text>

          <TextInput
            ref={inputRef}
            style={[styles.input, error ? styles.inputError : null]}
            placeholder=""
            placeholderTextColor={colors.subtext}
            keyboardType="number-pad"
            maxLength={4}
            value={code}
            onChangeText={(v) => { setCode(v); setError(''); }}
            autoFocus
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {(process.env.EXPO_PUBLIC_TELEGRAM_USERNAME ?? '').trim() ? (
            <TouchableOpacity
              style={styles.telegramLink}
              onPress={() =>
                Linking.openURL(`https://t.me/${process.env.EXPO_PUBLIC_TELEGRAM_USERNAME}`)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.telegramLinkText}>{tr('verify_telegram_link')}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{tr('confirm_btn')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
