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
  });
