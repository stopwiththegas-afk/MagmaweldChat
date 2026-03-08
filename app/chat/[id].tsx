import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  type TextInput as TextInputType,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { useT } from '@/i18n';
import { ApiMessage, chatService } from '@/services/chatService';
import { socketService } from '@/services/socketService';

export default function ChatScreen() {
  const { id, name, username, otherUserId, avatar } = useLocalSearchParams<{ id: string; name?: string; username?: string; otherUserId?: string; avatar?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { colors, theme } = useSettings();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  /** Чат с удалённым пользователем — нет второго участника, поле ввода скрыто */
  const isOtherUserDeleted = !otherUserId || otherUserId === '';

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canSend, setCanSend] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const [haveBlockedOther, setHaveBlockedOther] = useState(false);
  const inputTextRef = useRef('');
  const inputRef = useRef<TextInputType>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    socketService.joinChat(id);

    chatService.getMessages(id)
      .then((msgs) => setMessages(msgs))
      .catch(() => {})
      .finally(() => setIsLoading(false));

    chatService.getChatInfo(id).then((info) => {
      setIsBlockedByOther(info.blockedByOther);
      setHaveBlockedOther(info.haveBlockedOther);
    }).catch(() => {});

    const unsubscribe = socketService.onNewMessage((msg) => {
      if (msg.chatId !== id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socketService.leaveChat(id);
      unsubscribe();
    };
  }, [id]);

  const sendMessage = () => {
    const text = inputTextRef.current.trim();
    if (!text || !id) return;

    const optimistic: ApiMessage = {
      id: `tmp-${Date.now()}`,
      chatId: id,
      text,
      senderId: user?.id ?? null,
      senderName: user?.displayName ?? null,
      senderUsername: user?.username ?? null,
      senderAvatar: user?.avatar ?? null,
      timestamp: new Date().toISOString(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    inputTextRef.current = '';
    setCanSend(false);
    inputRef.current?.clear();

    socketService.sendMessage(id, text, (result) => {
      if (result?.ok && result.message) {
        setMessages((prev) => {
          const withoutDup = prev.filter((m) => m.id !== result.message!.id);
          return withoutDup.map((m) =>
            m.id === optimistic.id ? { ...result.message!, isOwn: true } : m
          );
        });
      } else if (result?.error === 'err_blocked') {
        setIsBlockedByOther(true);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    });
  };

  const handleClearHistory = async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    setMenuVisible(false);
    try {
      await chatService.clearChatHistory(id);
      setMessages([]);
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    setMenuVisible(false);
    try {
      await chatService.deleteChat(id);
      router.replace('/(tabs)');
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!id || actionLoading || !otherUserId) return;
    setActionLoading(true);
    setMenuVisible(false);
    try {
      await chatService.blockUserInChat(id);
      setHaveBlockedOther(true);
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!id || actionLoading || !otherUserId) return;
    setActionLoading(true);
    setMenuVisible(false);
    try {
      await chatService.unblockUserInChat(id);
      setHaveBlockedOther(false);
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <StatusBar
        backgroundColor={colors.headerBg}
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
          <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerUserTouch}
            activeOpacity={0.7}
            onPress={() => {
              if (otherUserId && username) {
                router.push({ pathname: '/user/[id]', params: { id: otherUserId, username, displayName: name ?? '', avatar: avatar ?? '' } });
              }
            }}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(isOtherUserDeleted ? tr('deleted_user') : (name ?? 'Чат')).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>
                {isOtherUserDeleted ? tr('deleted_user') : (name ?? 'Чат')}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              activeOpacity={0.7}
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
        </View>

        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
            <Pressable style={[styles.menuCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleClearHistory}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color={colors.text} style={styles.menuItemIcon} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>{tr('clear_history')}</Text>
              </TouchableOpacity>
              {otherUserId ? (
                <>
                  <View style={[styles.menuDivider, { backgroundColor: colors.divider }]} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={haveBlockedOther ? handleUnblockUser : handleBlockUser}
                    disabled={actionLoading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={haveBlockedOther ? 'checkmark-circle-outline' : 'ban-outline'} size={18} color={colors.text} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { color: colors.text }]}>{haveBlockedOther ? tr('unblock_user') : tr('block_user')}</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              <View style={[styles.menuDivider, { backgroundColor: colors.divider }]} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeleteChat}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#c0392b" style={styles.menuItemIcon} />
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>{tr('delete_chat')}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={[...messages].reverse()}
            inverted
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => (
              <View style={item.isOwn ? styles.bubbleWrapOwn : styles.bubbleWrapOther}>
                <View style={[styles.bubble, item.isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, item.isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.bubbleTime, item.isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeOther]}>
                    {new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            )}
          />
        )}

        {!isOtherUserDeleted && !isBlockedByOther && !haveBlockedOther && (
          <View style={[styles.inputBar, { paddingBottom: 8 + (keyboardVisible ? 0 : insets.bottom) }]}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              onChangeText={(t) => {
                inputTextRef.current = t;
                setCanSend(t.trim().length > 0);
              }}
              placeholder="Сообщение..."
              placeholderTextColor={colors.subtext}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={sendMessage}
              activeOpacity={0.7}
              disabled={!canSend}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {isOtherUserDeleted && (
          <View style={[styles.inputBar, styles.inputBarDisabled, { paddingBottom: 8 + insets.bottom }]}>
            <Text style={[styles.inputBarDisabledText, { color: colors.subtext }]}>{tr('cannot_send_to_deleted_user')}</Text>
          </View>
        )}
        {isBlockedByOther && (
          <View style={[styles.inputBar, styles.inputBarDisabled, { paddingBottom: 8 + insets.bottom }]}>
            <Text style={[styles.inputBarDisabledText, { color: colors.subtext }]}>{tr('blocked_cannot_send')}</Text>
          </View>
        )}
        {haveBlockedOther && (
          <View style={[styles.inputBar, styles.inputBarDisabled, { paddingBottom: 8 + insets.bottom }]}>
            <Text style={[styles.inputBarDisabledText, { color: colors.subtext }]}>{tr('have_blocked_cannot_send')}</Text>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ReturnType<typeof useSettings>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerWrapper: {
      backgroundColor: c.headerBg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 10,
      backgroundColor: c.headerBg,
    },
    backBtn: { padding: 8, marginRight: 2 },
    headerUserTouch: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.divider,
      marginRight: 10,
    },
    avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '700', color: c.text },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    headerActionBtn: { padding: 8 },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 56,
      paddingRight: 12,
    },
    menuCard: {
      borderRadius: 12,
      paddingVertical: 6,
      minWidth: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    menuItemIcon: { marginRight: 10 },
    menuItemText: { fontSize: 15, fontWeight: '500' },
    menuItemDanger: { color: '#c0392b' },
    menuDivider: { height: 1, marginHorizontal: 10 },
    messageList: { padding: 12, paddingBottom: 8, flexGrow: 1 },
    bubbleWrapOwn: { marginBottom: 6, alignItems: 'flex-end' },
    bubbleWrapOther: { marginBottom: 6, alignItems: 'flex-start' },
    bubble: {
      maxWidth: '75%',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 6,
    },
    bubbleOwn: { alignSelf: 'flex-end', backgroundColor: c.accent, borderBottomRightRadius: 4 },
    bubbleOther: { alignSelf: 'flex-start', backgroundColor: c.bubble, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 15 },
    bubbleTextOwn: { color: '#fff' },
    bubbleTextOther: { color: c.text },
    bubbleTime: { fontSize: 11, marginTop: 3, alignSelf: 'flex-end' },
    bubbleTimeOwn: { color: 'rgba(255,255,255,0.7)' },
    bubbleTimeOther: { color: c.subtext },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: c.headerBg,
    },
    inputBarDisabled: {
      justifyContent: 'center',
      paddingVertical: 12,
    },
    inputBarDisabledText: {
      fontSize: 14,
    },
    input: {
      flex: 1,
      backgroundColor: c.bubble,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 15,
      color: c.text,
      maxHeight: 120,
      marginRight: 8,
    },
    sendBtn: {
      backgroundColor: c.accent,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
  });
