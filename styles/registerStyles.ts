import { StyleSheet } from 'react-native';

import { AppColors } from '@/context/settings';

export const makeRegisterStyles = (c: AppColors) =>
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
      paddingTop: 180,
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
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.labelText,
      marginBottom: 6,
      marginLeft: 2,
    },
    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1.5,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: c.text,
      marginBottom: 16,
    },
    inputError: {
      borderColor: '#e53935',
    },
    error: {
      color: '#e53935',
      fontSize: 13,
      marginBottom: 16,
    },
    button: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 4,
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
