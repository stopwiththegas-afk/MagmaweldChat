import { StyleSheet } from 'react-native';

import { AppColors } from '@/context/settings';

export const makeContactsStyles = (c: AppColors) =>
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
    searchWrap: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: 16,
      marginBottom: 8,
    },
    searchInput: {
      backgroundColor: '#fff',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: c.text,
      minHeight: 44,
    },
    list: {
      flex: 1,
      marginTop: 0,
    },
    separator: {
      height: 1,
      backgroundColor: c.divider,
      marginLeft: 76,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.card,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    userAvatarImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    userAvatarText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '600',
    },
    userBody: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
      marginBottom: 2,
    },
    userUsername: {
      fontSize: 14,
      color: c.subtext,
    },
    emptyText: {
      fontSize: 15,
      color: c.subtext,
      textAlign: 'center',
      paddingVertical: 24,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      paddingTop: 16,
    },
    sectionHeaderText: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
  });
