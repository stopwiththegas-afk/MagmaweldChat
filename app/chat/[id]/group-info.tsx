import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '@/context/settings';
import { useT } from '@/i18n';
import { chatService, type ChatInfo } from '@/services/chatService';
import { makeProfileStyles } from '@/styles/profileStyles';

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useSettings();
  const tr = useT();
  const s = useMemo(() => makeProfileStyles(colors), [colors]);

  const [info, setInfo] = useState<ChatInfo | null>(null);
  const [loading, setLoading] = useState(true);

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

  const createdDate = info?.createdAt
    ? new Date(info.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const adminDisplay = info?.admin ? (info.admin.displayName || info.admin.username) : '—';
  const avatarInitial = (info?.name ?? 'Г').charAt(0).toUpperCase();

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
              {info.participants?.map((member) => (
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
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
