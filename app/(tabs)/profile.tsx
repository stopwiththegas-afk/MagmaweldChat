import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { useT } from '@/i18n';
import { userService } from '@/services/userService';
import { makeProfileStyles } from '@/styles/profileStyles';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { colors } = useSettings();
  const tr = useT();
  const s = useMemo(() => makeProfileStyles(colors), [colors]);

  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar ?? null);

  const initials = user
    ? (user.displayName || user.username)
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

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
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      if (user) {
        await userService.update(user.id, { avatar: uri });
      }
    }
  };

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  if (isLoading || !user) return null;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{tr('profile')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.avatarSection}>
          <View style={s.avatarWrapper}>
            <View style={s.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarInitials}>{initials}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity style={s.addPhotoButton} onPress={handleAddPhoto} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={16} color="#fff" />
            <Text style={s.addPhotoText}>
              {avatarUri ? tr('change_photo') : tr('add_photo')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="person-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_name')}</Text>
              <Text style={s.infoValue}>{user.displayName}</Text>
            </View>
          </View>

          <View style={s.infoDivider} />

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="at-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_username')}</Text>
              <Text style={s.infoValue}>{user.username}</Text>
            </View>
          </View>

          <View style={s.infoDivider} />

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="call-outline" size={20} color={colors.accent} />
            </View>
            <View style={s.infoTextGroup}>
              <Text style={s.infoLabel}>{tr('field_phone')}</Text>
              <Text style={s.infoValue}>{user.phone}</Text>
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
