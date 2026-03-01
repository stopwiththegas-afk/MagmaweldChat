import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '@/context/settings';
import { useT } from '@/i18n';
import { chatService } from '@/services/chatService';
import { userService, type PublicProfile } from '@/services/userService';
import { makeProfileStyles } from '@/styles/profileStyles';

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; username: string; displayName?: string; avatar?: string }>();
  const { colors } = useSettings();
  const tr = useT();
  const s = useMemo(() => makeProfileStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  React.useEffect(() => {
    if (!params.id) {
      setLoadingProfile(false);
      return;
    }
    userService
      .getProfileById(params.id)
      .then((p) => setProfile(p))
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [params.id]);

  const displayName = profile?.displayName || params.displayName || params.username || 'Пользователь';
  const username = profile?.username ?? params.username ?? '';
  const avatar = profile?.avatar ?? params.avatar;
  const initial = (displayName || username).charAt(0).toUpperCase() || '?';

  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const phone = profile?.phone ?? '—';

  const handleWrite = async () => {
    if (!username || loading) return;
    setLoading(true);
    try {
      const chatId = await chatService.openOrCreateChat(username);
      router.replace({
        pathname: '/chat/[id]',
        params: { id: chatId, name: displayName, username, otherUserId: params.id, avatar: avatar ?? '' },
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{tr('profile')}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
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
        <Text style={s.headerTitle} numberOfLines={1}>{tr('profile')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.avatarSection}>
          <View style={s.avatarWrapper}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={[s.avatar, s.avatarImage]} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarInitials}>{initial}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[s.addPhotoButton, loading && { opacity: 0.6 }]}
            onPress={handleWrite}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={s.addPhotoText}>{tr('write_btn')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="person-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_name')}</Text>
              <Text style={s.infoValue}>{displayName}</Text>
            </View>
          </View>

          <View style={s.infoDivider} />

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="at-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_username')}</Text>
              <Text style={s.infoValue}>{username}</Text>
            </View>
          </View>

          <View style={s.infoDivider} />

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="call-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_phone')}</Text>
              <Text style={s.infoValue}>{phone}</Text>
            </View>
          </View>

          <View style={s.infoDivider} />

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_member_since')}</Text>
              <Text style={s.infoValue}>{joinDate}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
