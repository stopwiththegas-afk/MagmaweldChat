import { StyleSheet } from 'react-native';

import { AppColors } from '@/context/settings';

export const makeVerifyStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.authBackground,
    },
    container: {
      flex: 1,
    },
    inner: {
      paddingHorizontal: 28,
      paddingTop: 220,
    },
    back: {
      paddingHorizontal: 28,
      paddingTop: 48,
      paddingBottom: 8,
    },
    backText: {
      color: c.accent,
      fontSize: 15,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: c.subtitleText,
      marginBottom: 28,
      lineHeight: 22,
    },
    phone: {
      fontWeight: '600',
      color: c.text,
    },
    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1.5,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 24,
      color: c.text,
      letterSpacing: 8,
      textAlign: 'center',
      marginBottom: 8,
    },
    inputError: {
      borderColor: '#e53935',
    },
    error: {
      color: '#e53935',
      fontSize: 13,
      marginBottom: 16,
      textAlign: 'center',
    },
    button: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
