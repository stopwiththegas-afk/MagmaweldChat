import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import { makeProfileStyles } from '@/styles/profileStyles';

export type GroupMember = {
  id: string;
  displayName: string;
  username?: string;
  avatar?: string | null;
};

const MIN_GROUP_MEMBERS = 3;

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useSettings();
  const tr = useT();
  const s = useMemo(() => makeProfileStyles(colors), [colors]);

  const [groupName, setGroupName] = useState('');
  const [groupAvatarUri, setGroupAvatarUri] = useState<string | null>(null);
  const [participants, setParticipants] = useState<GroupMember[]>([]);

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
    Alert.alert(tr('add_members'), tr('coming_soon'));
  };

  const handleCreateGroup = () => {
    const totalMembers = 1 + participants.length;
    if (totalMembers < MIN_GROUP_MEMBERS) {
      Alert.alert(tr('create_group'), tr('group_min_members_hint'));
      return;
    }
    Alert.alert(tr('create_group'), tr('coming_soon'));
  };

  const totalMembers = 1 + participants.length;
  const canCreate = totalMembers >= MIN_GROUP_MEMBERS;
  const adminDisplay = user ? (user.displayName || user.username) : '—';
  const createdDate = '—';

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
          disabled={!canCreate}
        >
          <Text style={s.createGroupButtonText}>{tr('create_group_btn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
