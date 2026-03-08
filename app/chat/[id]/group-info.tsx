import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
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
import { chatService, type ChatInfo } from '@/services/chatService';
import { userService } from '@/services/userService';
import { makeProfileStyles } from '@/styles/profileStyles';
import { makeContactsStyles } from '@/styles/contactsStyles';

type SearchUser = { id: string; username: string; displayName: string; avatar?: string | null };
const DEBOUNCE_MS = 350;

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useSettings();
  const tr = useT();
  const s = useMemo(() => makeProfileStyles(colors), [colors]);
  const contactStyles = useMemo(() => makeContactsStyles(colors), [colors]);

  const [info, setInfo] = useState<ChatInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<SearchUser[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInfo = useCallback(() => {
    if (!id) return;
    chatService
      .getChatInfo(id)
      .then((data) => {
        if (data.isGroup) setInfo(data);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    chatService
      .getChatInfo(id)
      .then((data) => {
        if (data.isGroup) setInfo(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!addModalVisible) return;
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
        .then((list) => list.filter((u) => !info?.participants?.some((p) => p.id === u.id)))
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
  }, [addModalVisible, searchQuery, info?.participants]);

  const isAdmin = Boolean(id && user?.id && info?.adminId === user.id);
  const createdDate = info?.createdAt
    ? new Date(info.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const adminDisplay = info?.admin ? (info.admin.displayName || info.admin.username) : '—';
  const avatarInitial = (info?.name ?? 'Г').charAt(0).toUpperCase();

  const openAddModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedToAdd([]);
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedToAdd([]);
  };

  const openEditModal = useCallback(() => {
    if (!info) return;
    setEditName(info.name ?? '');
    setEditAvatarUri(info.avatar ?? null);
    setEditModalVisible(true);
  }, [info]);

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
    setEditName('');
    setEditAvatarUri(null);
  }, []);

  const handleChangeGroupPhoto = useCallback(async () => {
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
      setEditAvatarUri(result.assets[0].uri);
    }
  }, [tr]);

  const handleSaveGroupEdit = useCallback(async () => {
    if (!id) return;
    const name = editName.trim() || tr('placeholder_group_name');
    setEditSaving(true);
    try {
      await chatService.updateGroup(id, { name, avatar: editAvatarUri });
      setInfo((prev) =>
        prev ? { ...prev, name, avatar: editAvatarUri } : null
      );
      closeEditModal();
    } catch (e: unknown) {
      const raw = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
      const msg =
        raw === 'err_only_admin_can_edit_group' ? tr('err_only_admin_can_edit_group') :
        raw === 'err_invalid_avatar' ? tr('err_invalid_avatar') :
        raw || tr('err_generic');
      Alert.alert(tr('edit_group'), msg);
    } finally {
      setEditSaving(false);
    }
  }, [id, editName, editAvatarUri, closeEditModal, tr]);

  const toggleSelected = useCallback((u: SearchUser) => {
    setSelectedToAdd((prev) => {
      if (prev.some((p) => p.id === u.id)) return prev.filter((p) => p.id !== u.id);
      return [...prev, { ...u }];
    });
  }, []);

  const handleAddParticipants = async () => {
    if (!id || selectedToAdd.length === 0) return;
    setAddLoading(true);
    try {
      await chatService.addGroupParticipants(id, selectedToAdd.map((p) => p.id));
      fetchInfo();
      closeAddModal();
    } catch (e: unknown) {
      const raw = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
      const msg =
        raw === 'err_only_admin_can_add' ? tr('err_only_admin_can_add') :
        raw === 'err_user_not_found' ? tr('contacts_empty_search') :
        raw || tr('err_generic');
      Alert.alert(tr('add_members'), msg);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveMember = useCallback((memberId: string, displayName: string) => {
    if (!id) return;
    Alert.alert(
      tr('remove_member_confirm_title'),
      `${tr('remove_member_confirm_message')} ${displayName}`,
      [
        { text: tr('cancel'), style: 'cancel' },
        {
          text: tr('remove_member'),
          style: 'destructive',
          onPress: async () => {
            setRemoveLoadingId(memberId);
            try {
              await chatService.removeGroupParticipant(id, memberId);
              fetchInfo();
            } catch (e: unknown) {
              const raw = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
              const msg =
                raw === 'err_only_admin_can_remove' ? tr('err_only_admin_can_remove') :
                raw || tr('err_generic');
              Alert.alert(tr('remove_member'), msg);
            } finally {
              setRemoveLoadingId(null);
            }
          },
        },
      ]
    );
  }, [id, tr, fetchInfo]);

  const handleDeleteGroup = useCallback(() => {
    if (!id) return;
    Alert.alert(
      tr('delete_group_confirm_title'),
      tr('delete_group_confirm_message'),
      [
        { text: tr('cancel'), style: 'cancel' },
        {
          text: tr('delete_group'),
          style: 'destructive',
          onPress: async () => {
            setDeleteGroupLoading(true);
            try {
              await chatService.deleteChat(id);
              router.replace('/(tabs)');
            } catch (e: unknown) {
              const raw = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
              Alert.alert(tr('delete_group'), raw || tr('err_generic'));
            } finally {
              setDeleteGroupLoading(false);
            }
          },
        },
      ]
    );
  }, [id, tr, router]);

  const renderSearchUser = useCallback(
    ({ item }: { item: SearchUser }) => {
      const isSelf = user && item.id === user.id;
      const isAdded = selectedToAdd.some((p) => p.id === item.id);
      const alreadyInGroup = info?.participants?.some((p) => p.id === item.id);
      const initial = (item.displayName || item.username).charAt(0).toUpperCase();
      const onPress = () => {
        if (isSelf || alreadyInGroup) return;
        toggleSelected(item);
      };
      if (alreadyInGroup) return null;
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
    [contactStyles, user, info?.participants, selectedToAdd, toggleSelected, colors.accent, tr]
  );

  const q = searchQuery.trim().replace(/^@/, '');
  const isPhoneLike = /^[\d+\s\-()]+$/.test(q);
  const minLen = isPhoneLike ? 1 : 2;
  const showSearchResults = q.length >= minLen;

  if (loading || !info?.isGroup) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{tr('field_group_members')}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {loading ? <ActivityIndicator size="large" color={colors.accent} /> : <Text style={s.infoValue}>{tr('err_generic')}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{info.name ?? 'Группа'}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.avatarSection}>
          <View style={s.avatarWrapper}>
            <View style={s.avatar}>
              {info.avatar ? (
                <Image source={{ uri: info.avatar }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarInitials}>{avatarInitial}</Text>
              )}
            </View>
          </View>
          {isAdmin && (
            <TouchableOpacity style={s.addPhotoButton} onPress={openEditModal} activeOpacity={0.8}>
              <Ionicons name="pencil-outline" size={16} color="#fff" />
              <Text style={s.addPhotoText}>{tr('edit_group')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="people-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_group_name')}</Text>
              <Text style={s.infoValue}>{info.name ?? '—'}</Text>
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
              {info.participants?.map((member) => {
                const isSelf = user?.id === member.id;
                const canRemove = isAdmin && !isSelf;
                const loadingRemove = removeLoadingId === member.id;
                return (
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
                    {canRemove ? (
                      <TouchableOpacity
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        onPress={() => handleRemoveMember(member.id, member.displayName || member.username)}
                        style={{ padding: 4 }}
                        disabled={loadingRemove}
                      >
                        {loadingRemove ? (
                          <ActivityIndicator size="small" color={colors.subtext} />
                        ) : (
                          <Ionicons name="close-circle-outline" size={22} color={colors.subtext} />
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={s.addMembersButton}
                onPress={openAddModal}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={18} color={colors.accent} />
                <Text style={s.addMembersButtonText}>{tr('add_members')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={[s.deleteButton, deleteGroupLoading && { opacity: 0.7 }]}
            onPress={handleDeleteGroup}
            activeOpacity={0.8}
            disabled={deleteGroupLoading}
          >
            {deleteGroupLoading ? (
              <ActivityIndicator color="#c62828" size="small" />
            ) : (
              <Text style={s.deleteButtonText}>{tr('delete_group')}</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={addModalVisible} animationType="slide" onRequestClose={closeAddModal}>
        <SafeAreaView style={[s.container, { flex: 1 }]}>
          <View style={[contactStyles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <TouchableOpacity onPress={closeAddModal} style={contactStyles.backButton} activeOpacity={0.7}>
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
          {selectedToAdd.length > 0 && (
            <View style={{ padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: colors.divider }}>
              <TouchableOpacity
                style={[s.createGroupButton, addLoading && { opacity: 0.7 }]}
                onPress={handleAddParticipants}
                activeOpacity={0.8}
                disabled={addLoading}
              >
                {addLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.createGroupButtonText}>
                    {tr('add_members')} ({selectedToAdd.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" onRequestClose={closeEditModal}>
        <SafeAreaView style={[s.container, { flex: 1 }]}>
          <View style={[s.header, { justifyContent: 'space-between' }]}>
            <TouchableOpacity onPress={closeEditModal} style={s.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.accent} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{tr('edit_group')}</Text>
            <View style={s.backButton} />
          </View>
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={s.avatarSection}>
              <View style={s.avatarWrapper}>
                <View style={s.avatar}>
                  {editAvatarUri ? (
                    <Image source={{ uri: editAvatarUri }} style={s.avatarImage} />
                  ) : (
                    <Text style={s.avatarInitials}>{(editName || 'Г').charAt(0).toUpperCase()}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={s.addPhotoButton} onPress={handleChangeGroupPhoto} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={16} color="#fff" />
                <Text style={s.addPhotoText}>
                  {editAvatarUri ? tr('change_photo') : tr('add_photo')}
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
                    value={editName}
                    onChangeText={setEditName}
                    placeholder={tr('placeholder_group_name')}
                    placeholderTextColor={colors.subtext}
                  />
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[s.createGroupButton, editSaving && { opacity: 0.7 }]}
              onPress={handleSaveGroupEdit}
              activeOpacity={0.8}
              disabled={editSaving}
            >
              {editSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.createGroupButtonText}>{tr('save')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
