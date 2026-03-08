import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useT } from '@/i18n';
import { useSettings } from '@/context/settings';

type Props = { chat: { id: string; name: string; username?: string; otherUserId?: string | null; avatar?: string | null; isGroup?: boolean; lastMessage: string; lastMessageSenderName?: string | null; timestamp: string; unreadCount: number; participantCount?: number } };

export default function ChatListItem({ chat }: Props) {
  const { colors } = useSettings();
  const tr = useT();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const displayName = chat.isGroup
    ? (chat.name || 'Группа')
    : (!chat.otherUserId || chat.otherUserId === '' ? tr('deleted_user') : chat.name);
  const participantLabel = chat.isGroup && chat.participantCount != null
    ? (() => {
        const n = chat.participantCount;
        const mod10 = n % 10;
        const mod100 = n % 100;
        const key = mod10 === 1 && mod100 !== 11 ? 'group_member_1'
          : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'group_member_2_4'
          : 'group_member_5_0';
        return ` · ${n} ${tr(key)}`;
      })()
    : '';
  const lastMessagePreview = (() => {
    if (chat.lastMessage.trim()) {
      return chat.isGroup && chat.lastMessageSenderName
        ? `${chat.lastMessageSenderName}: ${chat.lastMessage}`
        : chat.lastMessage;
    }
    return tr('no_messages');
  })();
  const initial = displayName.charAt(0).toUpperCase();
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
      onPress={() => router.push({
        pathname: '/chat/[id]',
        params: {
          id: chat.id,
          name: displayName,
          username: chat.username ?? '',
          otherUserId: chat.otherUserId ?? '',
          avatar: chat.avatar ?? '',
          isGroup: chat.isGroup ? '1' : undefined,
        },
      })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {participantLabel ? <Text style={styles.participantCount} numberOfLines={1}>{participantLabel}</Text> : null}
          </View>
          <Text style={styles.time}>{timeLabel}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.lastMsg} numberOfLines={1}>{lastMessagePreview}</Text>
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
    nameRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'baseline',
      minWidth: 0,
      marginRight: 8,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
      flexShrink: 1,
      minWidth: 0,
    },
    participantCount: {
      fontWeight: '400',
      color: c.subtext,
      fontSize: 14,
      flexShrink: 0,
      marginLeft: 2,
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
