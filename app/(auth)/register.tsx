import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { makeRegisterStyles } from '@/styles/registerStyles';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useSettings();
  const tr = useT();
  const styles = useMemo(() => makeRegisterStyles(colors), [colors]);

  const [username, setUsername] = useState('@');
  const [displayName, setDisplayName] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function validateUsername(value: string): string | null {
    if (!value || value === '@') return tr('val_enter_username');
    if (!value.startsWith('@')) return tr('val_username_at');

    const name = value.slice(1);

    if (name.length < 3) return tr('val_username_short');
    if (name.length > 32) return tr('val_username_long');
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return tr('val_username_chars');
    if (/^_/.test(name)) return tr('val_username_start_underscore');
    if (/_$/.test(name)) return tr('val_username_end_underscore');
    if (/__/.test(name)) return tr('val_username_double_underscore');
    if (/^\d/.test(name)) return tr('val_username_start_digit');

    return null;
  }

  function handleUsernameChange(value: string) {
    const normalized = value.startsWith('@') ? value : '@' + value.replace('@', '');
    setUsername(normalized);
    setUsernameError(validateUsername(normalized) ?? '');
    setError('');
  }

  async function handleRegister() {
    const usernameErr = validateUsername(username);
    if (usernameErr) {
      setUsernameError(usernameErr);
      return;
    }
    if (displayName.trim().length < 2) {
      setError(tr('val_name_short'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await register(username, displayName.trim());
    } catch (e: any) {
      const key = e.message as TranslationKey;
      setError(tr(key) ?? tr('err_generic'));
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
          <Text style={styles.title}>{tr('register_title')}</Text>
          <Text style={styles.subtitle}>{tr('register_subtitle')}</Text>

          <Text style={styles.label}>{tr('label_username')}</Text>
          <TextInput
            style={[styles.input, usernameError ? styles.inputError : null]}
            placeholder={tr('placeholder_username')}
            placeholderTextColor={colors.subtext}
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={33}
          />
          {usernameError ? <Text style={styles.error}>{usernameError}</Text> : null}

          <Text style={styles.label}>{tr('label_name')}</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder={tr('placeholder_name')}
            placeholderTextColor={colors.subtext}
            value={displayName}
            onChangeText={(v) => { setDisplayName(v); setError(''); }}
            autoCapitalize="words"
            maxLength={64}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{tr('create_account_btn')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
