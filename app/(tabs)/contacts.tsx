import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChatListItem from '@/components/ChatListItem';
import { useSettings } from '@/context/settings';
import { useT } from '@/i18n';
import { chatService, ChatSummary } from '@/services/chatService';
import { userService } from '@/services/userService';
import { makeContactsStyles } from '@/styles/contactsStyles';

type SearchUser = { id: string; username: string; displayName: string; avatar: string | null };

const DEBOUNCE_MS = 350;

export default function ContactsScreen() {
  const router = useRouter();
  const { colors } = useSettings();
  const tr = useT();
  const styles = useMemo(() => makeContactsStyles(colors), [colors]);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadChats = useCallback(() => {
    chatService.getChats().then(setChats).catch(() => {});
  }, []);

  React.useEffect(() => {
    loadChats();
  }, [loadChats]);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim().replace(/^@/, '');
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      userService
        .searchByUsername(q)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => {
          setSearchLoading(false);
          debounceRef.current = null;
        });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const showSearchResults = searchQuery.trim().length >= 2;

  const handleUserPress = useCallback(
    async (user: SearchUser) => {
      if (openingChat) return;
      setOpeningChat(true);
      try {
        const chatId = await chatService.openOrCreateChat(user.username);
        loadChats();
        router.push({ pathname: '/chat/[id]', params: { id: chatId, name: user.displayName || user.username, username: user.username, otherUserId: user.id, avatar: user.avatar ?? '' } });
      } catch {
        // ignore
      } finally {
        setOpeningChat(false);
      }
    },
    [openingChat, loadChats, router]
  );

  const renderSearchItem = useCallback(
    ({ item }: { item: SearchUser }) => {
      const initial = (item.displayName || item.username).charAt(0).toUpperCase();
      return (
        <TouchableOpacity
          style={styles.userRow}
          activeOpacity={0.7}
          onPress={() => handleUserPress(item)}
          disabled={openingChat}
        >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.userAvatarImage} />
          ) : (
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.userBody}>
            <Text style={styles.userName} numberOfLines={1}>{item.displayName || item.username}</Text>
            <Text style={styles.userUsername} numberOfLines={1}>@{item.username}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, handleUserPress, openingChat]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr('contacts')}</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder={tr('contacts_search_placeholder')}
          placeholderTextColor={colors.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {showSearchResults ? (
        <>
          {searchLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchItem}
              ItemSeparatorComponent={() => <View style={[styles.separator, { marginLeft: 16 + 48 + 12 }]} />}
              ListEmptyComponent={<Text style={styles.emptyText}>{tr('contacts_empty_search')}</Text>}
            />
          )}
        </>
      ) : (
        <FlatList
          style={styles.list}
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatListItem chat={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}
