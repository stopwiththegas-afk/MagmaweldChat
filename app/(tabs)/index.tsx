import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDrawerAnimation } from '@/animation/useDrawerAnimation';
import ChatListItem from '@/components/ChatListItem';
import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { useLayout } from '@/hooks/use-layout';
import { useT } from '@/i18n';
import { chatService, ChatSummary } from '@/services/chatService';
import { makeDrawerStyles } from '@/styles/drawerStyles';
import { makeHomeStyles } from '@/styles/homeStyles';

export default function HomeScreen() {
  const { scaleW, scaleH } = useLayout();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const router = useRouter();
  const { colors } = useSettings();
  const tr = useT();
  const { visible: menuVisible, slideAnim, overlayAnim, open: openMenu, close: closeMenu } = useDrawerAnimation();

  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [isCreating, setIsCreating] = React.useState(false);

  const loadChats = React.useCallback(() => {
    chatService.getChats().then(setChats).catch(() => {});
  }, []);

  React.useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleOpenBotChat = React.useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const chatId = await chatService.openOrCreateChat('bot');
      loadChats();
      router.push(`/chat/${chatId}`);
    } catch {
      // ignore
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, loadChats, router]);

  const homeStyles = useMemo(() => makeHomeStyles(colors), [colors]);
  const drawerStyles = useMemo(() => makeDrawerStyles(colors), [colors]);

  const handleLogout = () => closeMenu(logout);
  const handleProfile = () => closeMenu(() => router.push('/(tabs)/profile'));
  const handleSettings = () => closeMenu(() => router.push('/(tabs)/settings'));

  return (
    <SafeAreaView style={homeStyles.container}>
      <View style={homeStyles.header}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={{ width: scaleW(160), height: scaleH(40) }}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={openMenu} style={homeStyles.hamburger} activeOpacity={0.7}>
          <Ionicons name="menu" size={28} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList<ChatSummary>
        style={homeStyles.list}
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatListItem chat={item} />}
        ItemSeparatorComponent={() => <View style={homeStyles.separator} />}
      />

      <TouchableOpacity
        style={homeStyles.fab}
        onPress={handleOpenBotChat}
        activeOpacity={0.8}
        disabled={isCreating}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal transparent visible={menuVisible} animationType="none" onRequestClose={() => closeMenu()}>
        <Pressable style={drawerStyles.modalRoot} onPress={() => closeMenu()}>
          <Animated.View style={[drawerStyles.overlay, { opacity: overlayAnim }]} />
          <Pressable>
            <Animated.View style={[drawerStyles.drawer, { transform: [{ translateX: slideAnim }] }]}>
              <View style={[drawerStyles.drawerInner, { paddingTop: insets.top }]}>
                <View style={drawerStyles.drawerHeader}>
                  <TouchableOpacity onPress={() => closeMenu()} activeOpacity={0.7}>
                    <Ionicons name="close" size={24} color={colors.closeIcon} />
                  </TouchableOpacity>
                </View>

                <View style={drawerStyles.menuItems}>
                  <TouchableOpacity style={drawerStyles.menuItem} activeOpacity={0.7} onPress={handleProfile}>
                    <Ionicons name="person-outline" size={20} color={colors.accent} style={drawerStyles.menuIcon} />
                    <Text style={drawerStyles.menuItemText}>{tr('profile')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={drawerStyles.menuItem} activeOpacity={0.7} onPress={handleSettings}>
                    <Ionicons name="settings-outline" size={20} color={colors.accent} style={drawerStyles.menuIcon} />
                    <Text style={drawerStyles.menuItemText}>{tr('settings')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={[drawerStyles.drawerFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  <TouchableOpacity style={drawerStyles.menuItem} activeOpacity={0.7} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#c0392b" style={drawerStyles.menuIcon} />
                    <Text style={[drawerStyles.menuItemText, drawerStyles.logoutText]}>{tr('logout')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
