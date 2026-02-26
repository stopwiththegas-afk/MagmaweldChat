import { StyleSheet } from 'react-native';

import { AppColors } from '@/context/settings';

export const MENU_WIDTH = 260;

export const makeDrawerStyles = (c: AppColors) =>
  StyleSheet.create({
    modalRoot: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    drawer: {
      width: MENU_WIDTH,
      height: '100%',
      backgroundColor: c.drawerBg,
      shadowColor: '#000',
      shadowOffset: { width: -3, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 16,
    },
    drawerInner: {
      flex: 1,
    },
    drawerHeader: {
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    menuItems: {
      marginTop: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    menuIcon: {
      marginRight: 14,
    },
    menuItemText: {
      fontSize: 20,
      color: c.drawerItemText,
      fontWeight: '700',
    },
    divider: {
      height: 1,
      backgroundColor: c.drawerDivider,
      marginHorizontal: 16,
    },
    drawerFooter: {
      marginTop: 'auto',
      paddingBottom: 8,
    },
    logoutText: {
      color: '#c0392b',
    },
  });
