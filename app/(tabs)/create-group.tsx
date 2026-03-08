import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { useT } from '@/i18n';
import { chatService } from '@/services/chatService';
import { userService } from '@/services/userService';
import { makeProfileStyles } from '@/styles/profileStyles';
import { makeContactsStyles } from '@/styles/contactsStyles';

export type GroupMember = {
  id: string;
  displayName: string;
  username?: string;
  avatar?: string | null;
};

const MIN_GROUP_MEMBERS = 3;

type SearchUser = { id: string; username: string; displayName: string; avatar?: string | null };

const DEBOUNCE_MS = 350;

export default function CreateGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    otherUserId?: string;
    otherUserName?: string;
    otherUserUsername?: string;
    otherUserAvatar?: string;
  }>();
  const { user } = useAuth();
  const { colors } = useSettings();
  const tr = useT();
  const s = useMemo(() => makeProfileStyles(colors), [colors]);
  const contactStyles = useMemo(() => makeContactsStyles(colors), [colors]);

  const [groupName, setGroupName] = useState('');
  const [groupAvatarUri, setGroupAvatarUri] = useState<string | null>(null);
  const [participants, setParticipants] = useState<GroupMember[]>([]);
  const [creating, setCreating] = useState(false);
  const hasInitializedFromChat = useRef(false);

  const [addMembersVisible, setAddMembersVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasInitializedFromChat.current) return;
    const id = params.otherUserId;
    if (!id) return;
    hasInitializedFromChat.current = true;
    const displayName = typeof params.otherUserName === 'string' ? params.otherUserName : '';
    const username = typeof params.otherUserUsername === 'string' ? params.otherUserUsername : undefined;
    const avatar = typeof params.otherUserAvatar === 'string' && params.otherUserAvatar ? params.otherUserAvatar : null;
    setParticipants([{ id, displayName: displayName || id, username, avatar }]);
  }, [params.otherUserId, params.otherUserName, params.otherUserUsername, params.otherUserAvatar]);

  useEffect(() => {
    if (!addMembersVisible) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = searchQuery.trim().replace(/^@/, '');
    const isPhoneLike = /^[\d+\s\-()]+$/.test(q);
    const minLen = isPhoneLike ? 1 : 2;
    if (q.length < minLen) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(() => {
      userService
        .searchByUsername(q)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => {
          setSearchLoading(false);
          searchDebounceRef.current = null;
        });
    }, DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [addMembersVisible, searchQuery]);

  const avatarInitial =
    groupName.trim().charAt(0).toUpperCase() || 'Г';

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(tr('no_access'), tr('gallery_permission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setGroupAvatarUri(result.assets[0].uri);
    }
  };

  const handleAddMembers = () => {
    setSearchQuery('');
    setSearchResults([]);
    setAddMembersVisible(true);
  };

  const closeAddMembersModal = () => {
    setAddMembersVisible(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const addParticipant = useCallback((u: SearchUser) => {
    if (user && u.id === user.id) return;
    setParticipants((prev) => {
      if (prev.some((p) => p.id === u.id)) return prev;
      return [...prev, { id: u.id, displayName: u.displayName, username: u.username, avatar: u.avatar ?? null }];
    });
  }, [user]);

  const removeParticipant = useCallback((userId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== userId));
  }, []);

  const handleCreateGroup = async () => {
    const totalMembers = 1 + participants.length;
    if (totalMembers < MIN_GROUP_MEMBERS) {
      Alert.alert(tr('create_group'), tr('group_min_members_hint'));
      return;
    }
    const name = groupName.trim() || tr('placeholder_group_name');
    setCreating(true);
    try {
      const chatId = await chatService.createGroup({
        name,
        avatar: groupAvatarUri && groupAvatarUri.startsWith('http') ? groupAvatarUri : undefined,
        participantIds: participants.map((p) => p.id),
      });
      setCreating(false);
      router.replace({
        pathname: '/chat/[id]',
        params: { id: chatId, name, isGroup: '1', avatar: groupAvatarUri ?? '' },
      });
    } catch (e: unknown) {
      setCreating(false);
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : tr('err_generic');
      Alert.alert(tr('create_group'), msg);
    }
  };

  const totalMembers = 1 + participants.length;
  const canCreate = totalMembers >= MIN_GROUP_MEMBERS;
  const adminDisplay = user ? (user.displayName || user.username) : '—';
  const createdDate = '—';

  const renderSearchUser = useCallback(
    ({ item }: { item: SearchUser }) => {
      const isSelf = user && item.id === user.id;
      const isAdded = participants.some((p) => p.id === item.id);
      const initial = (item.displayName || item.username).charAt(0).toUpperCase();
      const onPress = () => {
        if (isSelf) return;
        if (isAdded) removeParticipant(item.id);
        else addParticipant(item);
      };
      return (
        <TouchableOpacity
          style={contactStyles.userRow}
          activeOpacity={0.7}
          onPress={onPress}
          disabled={isSelf}
        >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={contactStyles.userAvatarImage} />
          ) : (
            <View style={contactStyles.userAvatar}>
              <Text style={contactStyles.userAvatarText}>{initial}</Text>
            </View>
          )}
          <View style={contactStyles.userBody}>
            <Text style={contactStyles.userName} numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
            <Text style={contactStyles.userUsername} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
          {isAdded ? (
            <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
          ) : isSelf ? (
            <Text style={[contactStyles.userUsername, { fontSize: 12 }]}>{tr('field_group_admin')}</Text>
          ) : (
            <Ionicons name="person-add-outline" size={22} color={colors.accent} />
          )}
        </TouchableOpacity>
      );
    },
    [contactStyles, user, participants, addParticipant, removeParticipant, colors.accent, tr]
  );

  const q = searchQuery.trim().replace(/^@/, '');
  const isPhoneLike = /^[\d+\s\-()]+$/.test(q);
  const minLen = isPhoneLike ? 1 : 2;
  const showSearchResults = q.length >= minLen;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{tr('create_group')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.avatarSection}>
          <View style={s.avatarWrapper}>
            <View style={s.avatar}>
              {groupAvatarUri ? (
                <Image source={{ uri: groupAvatarUri }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarInitials}>{avatarInitial}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.addPhotoButton} onPress={handleAddPhoto} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={16} color="#fff" />
            <Text style={s.addPhotoText}>
              {groupAvatarUri ? tr('change_photo') : tr('add_photo')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="people-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_group_name')}</Text>
              <TextInput
                style={s.infoInput}
                value={groupName}
                onChangeText={setGroupName}
                placeholder={tr('placeholder_group_name')}
                placeholderTextColor={colors.subtext}
              />
            </View>
          </View>

          <View style={s.infoDivider} />

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="person-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_group_admin')}</Text>
              <Text style={s.infoValue}>{adminDisplay}</Text>
            </View>
          </View>

          <View style={s.infoDivider} />

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_group_created_at')}</Text>
              <Text style={s.infoValue}>{createdDate}</Text>
            </View>
          </View>

          <View style={s.infoDivider} />

          <View style={s.membersSection}>
            <View style={s.infoRow}>
              <View style={s.infoIcon}>
                <Ionicons name="people-outline" size={20} color={colors.accent} />
              </View>
              <View style={s.infoTextGroup}>
                <Text style={s.infoLabel}>{tr('field_group_members')}</Text>
              </View>
            </View>
            <View style={s.membersList}>
              {participants.map((member) => (
                <View key={member.id} style={s.memberRow}>
                  <View style={s.memberAvatar}>
                    {member.avatar ? (
                      <Image source={{ uri: member.avatar }} style={s.memberAvatarImage} />
                    ) : (
                      <Text style={s.memberInitials}>
                        {(member.displayName || member.username || '?').charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={s.memberName} numberOfLines={1}>
                    {member.displayName || member.username || member.id}
                  </Text>
                  <TouchableOpacity
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    onPress={() => removeParticipant(member.id)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle-outline" size={22} color={colors.subtext} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={s.addMembersButton}
              onPress={handleAddMembers}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.accent} />
              <Text style={s.addMembersButtonText}>{tr('add_members')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!canCreate && (
          <Text style={s.minMembersHint}>{tr('group_min_members_hint')}</Text>
        )}

        <TouchableOpacity
          style={[s.createGroupButton, !canCreate && { opacity: 0.5 }]}
          onPress={handleCreateGroup}
          activeOpacity={0.8}
          disabled={!canCreate || creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.createGroupButtonText}>{tr('create_group_btn')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={addMembersVisible}
        animationType="slide"
        onRequestClose={closeAddMembersModal}
      >
        <SafeAreaView style={[s.container, { flex: 1 }]}>
          <View style={[contactStyles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <TouchableOpacity onPress={closeAddMembersModal} style={contactStyles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.accent} />
            </TouchableOpacity>
            <Text style={contactStyles.headerTitle}>{tr('add_members')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={contactStyles.searchWrap}>
            <TextInput
              style={contactStyles.searchInput}
              placeholder={tr('contacts_search_placeholder')}
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {showSearchResults ? (
            searchLoading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchUser}
                ItemSeparatorComponent={() => <View style={[contactStyles.separator, { marginLeft: 16 + 48 + 12, backgroundColor: colors.divider }]} />}
                ListEmptyComponent={<Text style={[contactStyles.emptyText, { color: colors.subtext }]}>{tr('contacts_empty_search')}</Text>}
              />
            )
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={[contactStyles.emptyText, { color: colors.subtext }]}>{tr('contacts_search_placeholder')}</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
