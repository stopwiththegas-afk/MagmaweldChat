import { StyleSheet } from 'react-native';

import { AppColors } from '@/context/settings';

export const makeSettingsStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 32,
      paddingBottom: 12,
    },
    backButton: {
      padding: 6,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: c.text,
    },
    scrollContent: {
      paddingVertical: 24,
      paddingBottom: 40,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.sectionLabel,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
      marginHorizontal: 20,
    },
    card: {
      marginHorizontal: 20,
      backgroundColor: c.card,
      borderRadius: 16,
      paddingVertical: 4,
      marginBottom: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
    },
    optionIcon: {
      marginRight: 14,
      width: 22,
      alignItems: 'center',
    },
    langSymbol: {
      fontSize: 18,
      fontWeight: '700',
      color: c.accent,
      width: 22,
      textAlign: 'center',
      marginRight: 14,
    },
    optionLabel: {
      flex: 1,
      fontSize: 16,
      color: c.text,
      fontWeight: '500',
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: c.accent,
    },
    divider: {
      height: 1,
      backgroundColor: c.divider,
      marginHorizontal: 20,
    },
  });
