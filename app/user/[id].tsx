import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '@/context/settings';
import { useT } from '@/i18n';
import { chatService } from '@/services/chatService';
import { makeProfileStyles } from '@/styles/profileStyles';

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; username: string; displayName?: string; avatar?: string }>();
  const { colors } = useSettings();
  const tr = useT();
  const s = useMemo(() => makeProfileStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);

  const displayName = params.displayName || params.username || 'Пользователь';
  const initial = displayName.charAt(0).toUpperCase();

  const handleWrite = async () => {
    if (!params.username || loading) return;
    setLoading(true);
    try {
      const chatId = await chatService.openOrCreateChat(params.username);
      router.replace({ pathname: '/chat/[id]', params: { id: chatId, name: displayName, username: params.username, otherUserId: params.id } });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{displayName}</Text>
      </View>

      <View style={s.avatarSection}>
        <View style={s.avatarWrapper}>
          {params.avatar ? (
            <Image source={{ uri: params.avatar }} style={[s.avatar, s.avatarImage]} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarInitials}>{initial}</Text>
            </View>
          )}
        </View>
        <Text style={[s.infoValue, { fontSize: 18, marginBottom: 4 }]}>{displayName}</Text>
        <Text style={[s.infoLabel, { textTransform: 'none', marginBottom: 16 }]}>@{params.username}</Text>

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
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={s.addPhotoText}>{tr('write_btn')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
