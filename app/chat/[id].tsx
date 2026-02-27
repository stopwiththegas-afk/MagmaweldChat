import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  type TextInput as TextInputType,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { ApiMessage, chatService } from '@/services/chatService';
import { socketService } from '@/services/socketService';

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useSettings();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canSend, setCanSend] = useState(false);
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

    const unsubscribe = socketService.onNewMessage((msg) => {
      if (msg.chatId !== id) return;
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
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
      senderId: user?.id ?? '',
      senderName: user?.displayName ?? '',
      senderUsername: user?.username ?? '',
      senderAvatar: user?.avatar ?? null,
      timestamp: new Date().toISOString(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    inputTextRef.current = '';
    setCanSend(false);
    inputRef.current?.clear();
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

    socketService.sendMessage(id, text, (result) => {
      if (result?.ok && result.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...result.message!, isOwn: true } : m))
        );
      }
    });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name ?? 'Ч').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{name ?? 'Чат'}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, item.isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
                  {item.text}
                </Text>
                <Text style={[styles.bubbleTime, item.isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeOther]}>
                  {new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          />
        )}

        <View style={styles.inputBar}>
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ReturnType<typeof useSettings>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 40,
      paddingBottom: 12,
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    backBtn: { padding: 4, marginRight: 8 },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    avatarText: { color: '#fff', fontSize: 17, fontWeight: '600' },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 17, fontWeight: '700', color: c.text },
    messageList: { padding: 12, paddingBottom: 8 },
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
      paddingVertical: 8,
      paddingBottom: 44,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      backgroundColor: c.background,
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
