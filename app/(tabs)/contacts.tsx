import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useSettings } from '@/context/settings';
import { useT } from '@/i18n';
import { chatService, ChatSummary } from '@/services/chatService';
import {
  filterDeviceContacts,
  getDeviceContacts,
  normalizePhone,
  requestPermission,
  type DeviceContact,
} from '@/services/deviceContactsService';
import { userService, type LookupUser } from '@/services/userService';
import { makeContactsStyles } from '@/styles/contactsStyles';

type SearchUser = { id: string; username: string; displayName: string; avatar: string | null };

const DEBOUNCE_MS = 350;

/** 1-1 chat converted to contact (other user) for profile navigation */
type ContactFromChat = { id: string; username: string; displayName: string; avatar: string | null };

type SearchSectionItem = SearchUser | { type: 'device'; contact: DeviceContact; user?: LookupUser };

function isNative(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export default function ContactsScreen() {
  const router = useRouter();
  const { colors } = useSettings();
  const tr = useT();
  const styles = useMemo(() => makeContactsStyles(colors), [colors]);

  const [contacts, setContacts] = useState<ContactFromChat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [devicePermissionStatus, setDevicePermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [deviceContactsLoading, setDeviceContactsLoading] = useState(false);
  const [lookupMap, setLookupMap] = useState<Map<string, LookupUser>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadContacts = useCallback(() => {
    chatService.getChats().then((list) => {
      const fromChats: ContactFromChat[] = list
        .filter((c): c is ChatSummary & { otherUserId: string } => !c.isGroup && !!c.otherUserId && c.otherUserId !== '')
        .map((c) => ({
          id: c.otherUserId!,
          username: c.username ?? '',
          displayName: c.name ?? '',
          avatar: c.avatar ?? null,
        }));
      setContacts(fromChats);
    }).catch(() => {});
  }, []);

  const loadDeviceContacts = useCallback(async () => {
    if (!isNative()) return;
    const status = await requestPermission();
    setDevicePermissionStatus(status);
    if (status !== 'granted') return;
    setDeviceContactsLoading(true);
    try {
      const list = await getDeviceContacts();
      setDeviceContacts(list);
    } finally {
      setDeviceContactsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
      if (isNative() && devicePermissionStatus === 'undetermined') {
        loadDeviceContacts();
      }
    }, [loadContacts, loadDeviceContacts, devicePermissionStatus])
  );

  const q = searchQuery.trim().replace(/^@/, '');
  const isPhoneLike = /^[\d+\s\-()]+$/.test(q);
  const minLen = isPhoneLike ? 1 : 2;
  const showSearchResults = q.length >= minLen;

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < minLen) {
      setSearchResults([]);
      setSearchLoading(false);
      setLookupMap(new Map());
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      userService
        .searchByUsername(q)
        .then((users) => {
          setSearchResults(users);
          if (isNative() && deviceContacts.length > 0 && devicePermissionStatus === 'granted') {
            const filtered = filterDeviceContacts(deviceContacts, q);
            const phones = new Set<string>();
            for (const c of filtered) {
              for (const p of c.phones) phones.add(normalizePhone(p));
            }
            const phoneList = [...phones].slice(0, 100);
            if (phoneList.length > 0) {
              userService.lookupByPhones(phoneList).then((lookupUsers) => {
                const map = new Map<string, LookupUser>();
                for (const u of lookupUsers) map.set(u.phone, u);
                setLookupMap(map);
              }).catch(() => setLookupMap(new Map()));
            } else {
              setLookupMap(new Map());
            }
          } else {
            setLookupMap(new Map());
          }
        })
        .catch(() => setSearchResults([]))
        .finally(() => {
          setSearchLoading(false);
          debounceRef.current = null;
        });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, deviceContacts, devicePermissionStatus]);

  const sections = useMemo((): { title: string; data: SearchSectionItem[] }[] => {
    if (!showSearchResults) return [];
    const inApp: SearchSectionItem[] = searchResults.map((u) => u);
    const deviceSection: SearchSectionItem[] = [];
    if (isNative() && devicePermissionStatus === 'granted' && deviceContacts.length > 0) {
      const filtered = filterDeviceContacts(deviceContacts, q);
      const addedUserIds = new Set(searchResults.map((u) => u.id));
      for (const contact of filtered) {
        let matchedUser: LookupUser | undefined;
        for (const phone of contact.phones) {
          const u = lookupMap.get(normalizePhone(phone));
          if (u && !addedUserIds.has(u.id)) {
            matchedUser = u;
            addedUserIds.add(u.id);
            break;
          }
        }
        if (matchedUser) {
          deviceSection.push({
            type: 'device',
            contact,
            user: matchedUser,
          });
        } else {
          deviceSection.push({ type: 'device', contact });
        }
      }
    }
    const result: { title: string; data: SearchSectionItem[] }[] = [];
    if (inApp.length > 0) {
      result.push({ title: tr('contacts_section_in_app'), data: inApp });
    }
    if (deviceSection.length > 0) {
      result.push({ title: tr('contacts_section_device'), data: deviceSection });
    }
    return result;
  }, [showSearchResults, searchResults, q, deviceContacts, devicePermissionStatus, lookupMap, tr]);

  const handleOpenProfile = useCallback(
    (user: { id: string; username: string; displayName: string; avatar: string | null }) => {
      router.push({
        pathname: '/user/[id]',
        params: { id: user.id, username: user.username, displayName: user.displayName || user.username, avatar: user.avatar ?? '' },
      });
    },
    [router]
  );

  const renderSearchUserRow = useCallback(
    (item: SearchUser) => {
      const initial = (item.displayName || item.username).charAt(0).toUpperCase();
      return (
        <TouchableOpacity
          style={styles.userRow}
          activeOpacity={0.7}
          onPress={() => handleOpenProfile(item)}
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
    [styles, handleOpenProfile]
  );

  const renderDeviceRow = useCallback(
    (item: { type: 'device'; contact: DeviceContact; user?: LookupUser }) => {
      const { contact, user } = item;
      if (user) {
        return renderSearchUserRow({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar ?? null,
        });
      }
      const initial = contact.name.charAt(0).toUpperCase() || '?';
      return (
        <View style={styles.userRow}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{initial}</Text>
          </View>
          <View style={styles.userBody}>
            <Text style={styles.userName} numberOfLines={1}>{contact.name}</Text>
            <Text style={[styles.userUsername, { color: colors.subtext }]} numberOfLines={1}>
              {tr('contacts_not_in_app')}
            </Text>
          </View>
        </View>
      );
    },
    [styles, colors.subtext, tr, renderSearchUserRow]
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchSectionItem }) => {
      if ('type' in item && item.type === 'device') {
        return renderDeviceRow(item);
      }
      return renderSearchUserRow(item as SearchUser);
    },
    [renderSearchUserRow, renderDeviceRow]
  );

  const keyExtractor = useCallback((item: SearchSectionItem, index: number) => {
    if ('type' in item && item.type === 'device') {
      return item.user ? item.user.id : `device-${item.contact.id}-${index}`;
    }
    return (item as SearchUser).id;
  }, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionHeaderText, { color: colors.subtext }]}>{section.title}</Text>
      </View>
    ),
    [styles, colors]
  );

  const renderContactItem = useCallback(
    ({ item }: { item: ContactFromChat }) => {
      const initial = (item.displayName || item.username).charAt(0).toUpperCase();
      return (
        <TouchableOpacity
          style={styles.userRow}
          activeOpacity={0.7}
          onPress={() => handleOpenProfile(item)}
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
    [styles, handleOpenProfile]
  );

  const separator = useMemo(() => <View style={[styles.separator, { marginLeft: 16 + 48 + 12 }]} />, [styles]);

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

      {isNative() && devicePermissionStatus === 'undetermined' && (
        <TouchableOpacity
          style={{ padding: 12, marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.accent + '20', borderRadius: 8 }}
          onPress={loadDeviceContacts}
          disabled={deviceContactsLoading}
        >
          <Text style={{ color: colors.accent, textAlign: 'center', fontSize: 14 }}>{tr('contacts_permission_message')}</Text>
          {deviceContactsLoading && <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: 6 }} />}
        </TouchableOpacity>
      )}

      {showSearchResults ? (
        <>
          {searchLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : sections.length === 0 ? (
            <Text style={styles.emptyText}>{tr('contacts_empty_search')}</Text>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              ItemSeparatorComponent={() => separator}
              ListEmptyComponent={null}
              stickySectionHeadersEnabled={false}
            />
          )}
        </>
      ) : (
        <FlatList
          style={styles.list}
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContactItem}
          ItemSeparatorComponent={() => separator}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.subtext }]}>{tr('contacts_empty_search')}</Text>}
        />
      )}

    </SafeAreaView>
  );
}
