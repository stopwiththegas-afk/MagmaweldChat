import { StyleSheet } from 'react-native';

import { AppColors } from '@/context/settings';

export const makeHomeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    hamburger: {
      padding: 6,
    },
    list: {
      flex: 1,
      marginTop: 16,
    },
    separator: {
      height: 1,
      backgroundColor: c.divider,
      marginLeft: 76,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    newChatMenuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      paddingBottom: 24 + 56 + 24,
      paddingRight: 24,
    },
    newChatMenuCard: {
      borderRadius: 12,
      paddingVertical: 6,
      minWidth: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    newChatMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    newChatMenuItemIcon: { marginRight: 10 },
    newChatMenuItemText: { fontSize: 15, fontWeight: '500' },
    newChatMenuDivider: { height: 1, marginHorizontal: 10 },
  });
