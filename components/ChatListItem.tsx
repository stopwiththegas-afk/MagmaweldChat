import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSettings } from '@/context/settings';

type Props = { chat: { id: string; name: string; username?: string; otherUserId?: string | null; avatar?: string | null; lastMessage: string; timestamp: string; unreadCount: number } };

export default function ChatListItem({ chat }: Props) {
  const { colors } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const initial = chat.name.charAt(0).toUpperCase();
  const timeLabel = (() => {
    try {
      return new Date(chat.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return chat.timestamp;
    }
  })();

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.id, name: chat.name, username: chat.username ?? '', otherUserId: chat.otherUserId ?? '', avatar: chat.avatar ?? '' } })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{chat.name}</Text>
          <Text style={styles.time}>{timeLabel}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.lastMsg} numberOfLines={1}>{chat.lastMessage}</Text>
          {chat.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{chat.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ReturnType<typeof useSettings>['colors']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.card,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '600',
    },
    body: {
      flex: 1,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    name: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
      marginRight: 8,
    },
    time: {
      fontSize: 12,
      color: c.subtext,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    lastMsg: {
      flex: 1,
      fontSize: 14,
      color: c.subtext,
      marginRight: 8,
    },
    badge: {
      backgroundColor: c.accent,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    badgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
  });
