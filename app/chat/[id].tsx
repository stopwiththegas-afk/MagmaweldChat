import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const { id, name, username, otherUserId, avatar, isGroup: isGroupParam } = useLocalSearchParams<{
    id: string;
    name?: string;
    username?: string;
    otherUserId?: string;
    avatar?: string;
    isGroup?: string;
  }>();
  const { user } = useAuth();
  const router = useRouter();
  const { colors, theme } = useSettings();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [isGroup, setIsGroup] = useState(isGroupParam === '1' || isGroupParam === 'true');
  const [groupName, setGroupName] = useState(name ?? '');
  const [groupAvatar, setGroupAvatar] = useState(avatar ?? '');
  const [groupParticipantCount, setGroupParticipantCount] = useState<number | null>(null);

  /** Чат с удалённым пользователем — нет второго участника, поле ввода скрыто */
  const isOtherUserDeleted = !isGroup && (!otherUserId || otherUserId === '');

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
  const [groupAdminId, setGroupAdminId] = useState<string | null>(null);
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
      if (info.isGroup) {
        setIsGroup(true);
        setIsBlockedByOther(false);
        setHaveBlockedOther(false);
        if (info.name != null) setGroupName(info.name);
        if (info.avatar != null) setGroupAvatar(info.avatar ?? '');
        setGroupAdminId(info.adminId ?? null);
        setGroupParticipantCount(info.participants?.length ?? null);
      } else {
        setIsBlockedByOther(info.blockedByOther);
        setHaveBlockedOther(info.haveBlockedOther);
        setGroupAdminId(null);
        setGroupParticipantCount(null);
      }
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

  useFocusEffect(
    useCallback(() => {
      if (!id || !isGroup) return;
      chatService.getChatInfo(id).then((info) => {
        if (info.isGroup && info.name != null) setGroupName(info.name);
        if (info.isGroup && info.avatar != null) setGroupAvatar(info.avatar ?? '');
        if (info.isGroup) setGroupParticipantCount(info.participants?.length ?? null);
      }).catch(() => {});
    }, [id, isGroup])
  );

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
    setMenuVisible(false);
    Alert.alert(
      tr('clear_history_confirm_title'),
      tr('clear_history_confirm_message'),
      [
        { text: tr('cancel'), style: 'cancel' },
        { text: tr('clear_history_confirm_btn'), onPress: doClearHistory },
      ]
    );
  };

  const doClearHistory = async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
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
    setMenuVisible(false);
    Alert.alert(
      tr('delete_chat_confirm_title'),
      tr('delete_chat_confirm_message'),
      [
        { text: tr('cancel'), style: 'cancel' },
        { text: tr('delete_chat'), onPress: doDeleteChat },
      ]
    );
  };

  const doDeleteChat = async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
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
    setMenuVisible(false);
    Alert.alert(
      tr('block_user_confirm_title'),
      tr('block_user_confirm_message'),
      [
        { text: tr('cancel'), style: 'cancel' },
        { text: tr('block_user'), onPress: doBlockUser },
      ]
    );
  };

  const doBlockUser = async () => {
    if (!id || actionLoading || !otherUserId) return;
    setActionLoading(true);
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

  const handleLeaveGroup = () => {
    if (!id || actionLoading || !isGroup) return;
    setMenuVisible(false);
    Alert.alert(
      tr('leave_group_confirm_title'),
      tr('leave_group_confirm_message'),
      [
        { text: tr('cancel'), style: 'cancel' },
        { text: tr('leave_group'), style: 'destructive', onPress: doLeaveGroup },
      ]
    );
  };

  const doLeaveGroup = async () => {
    if (!id || actionLoading || !isGroup) return;
    setActionLoading(true);
    try {
      await chatService.leaveGroup(id);
      router.replace('/(tabs)');
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenGroupInfo = () => {
    if (!id || !isGroup) return;
    router.push({ pathname: '/chat/[id]/group-info', params: { id } });
  };

  const displayName = isGroup ? (groupName || name || 'Группа') : (isOtherUserDeleted ? tr('deleted_user') : (name ?? 'Чат'));
  const groupMemberWord = (n: number) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return tr('group_member_5_0');
    if (mod10 === 1) return tr('group_member_1');
    if (mod10 >= 2 && mod10 <= 4) return tr('group_member_2_4');
    return tr('group_member_5_0');
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
              if (isGroup) handleOpenGroupInfo();
              else if (otherUserId && username) {
                router.push({ pathname: '/user/[id]', params: { id: otherUserId, username, displayName: name ?? '', avatar: avatar ?? '' } });
              }
            }}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              {isGroup && groupParticipantCount != null ? (
                <View style={styles.headerNameCol}>
                  <Text style={styles.headerName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.headerNameSub} numberOfLines={1}>
                    {groupParticipantCount} {groupMemberWord(groupParticipantCount)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.headerName} numberOfLines={1}>
                  {displayName}
                </Text>
              )}
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
              {isGroup ? (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setMenuVisible(false); /* TODO: notifications */ }}
                    disabled={actionLoading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="notifications-outline" size={18} color={colors.text} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { color: colors.text }]}>{tr('notifications')}</Text>
                  </TouchableOpacity>
                  {user?.id && groupAdminId !== user.id ? (
                    <>
                      <View style={[styles.menuDivider, { backgroundColor: colors.divider }]} />
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleLeaveGroup}
                        disabled={actionLoading}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="exit-outline" size={18} color="#c0392b" style={styles.menuItemIcon} />
                        <Text style={[styles.menuItemText, styles.menuItemDanger]}>{tr('leave_group')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </>
              ) : (
                <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  if (isOtherUserDeleted || isBlockedByOther || haveBlockedOther) return;
                  if (otherUserId) {
                    router.push({
                      pathname: '/(tabs)/create-group',
                      params: {
                        otherUserId,
                        otherUserName: name ?? '',
                        otherUserUsername: username ?? '',
                        otherUserAvatar: avatar ?? '',
                      },
                    });
                  } else {
                    router.push('/(tabs)/create-group');
                  }
                }}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="people-outline" size={18} color={colors.text} style={styles.menuItemIcon} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>{tr('create_group')}</Text>
              </TouchableOpacity>
              <View style={[styles.menuDivider, { backgroundColor: colors.divider }]} />
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
                </>
              )}
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

        {(isGroup || (!isOtherUserDeleted && !isBlockedByOther && !haveBlockedOther)) && (
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
        {!isGroup && isOtherUserDeleted && (
          <View style={[styles.inputBar, styles.inputBarDisabled, { paddingBottom: 8 + insets.bottom }]}>
            <Text style={[styles.inputBarDisabledText, { color: colors.subtext }]}>{tr('cannot_send_to_deleted_user')}</Text>
          </View>
        )}
        {!isGroup && isBlockedByOther && (
          <View style={[styles.inputBar, styles.inputBarDisabled, { paddingBottom: 8 + insets.bottom }]}>
            <Text style={[styles.inputBarDisabledText, { color: colors.subtext }]}>{tr('blocked_cannot_send')}</Text>
          </View>
        )}
        {!isGroup && haveBlockedOther && (
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
    headerName: { fontSize: 16, fontWeight: '600', color: c.text },
    headerNameCol: { flex: 1 },
    headerNameSub: { fontSize: 14, fontWeight: '400', color: c.subtext, marginTop: 1 },
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
