import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { useUserSettings } from '@/context/UserSettingsContext';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset } from '@/constants/theme';

export default function ProfilScreen() {
  const { t } = useTranslation();
  const { logOut } = useAuth();
  const { settings, createdAt, updateSettings } = useUserSettings();
  const theme = useTheme();

  const createdAtLabel = createdAt
    ? createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const row = [styles.row, { backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>{t('profil.title')}</ThemedText>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 24 }]}>

          {/* ── Thème ── */}
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t('profil.theme')}
          </ThemedText>
          <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
            {(['light', 'dark'] as const).map((th) => (
              <TouchableOpacity
                key={th}
                style={[styles.toggleOption, settings.theme === th && { backgroundColor: theme.backgroundSelected }]}
                onPress={() => updateSettings({ theme: th })}
              >
                <ThemedText type="small">
                  {th === 'light' ? `☀️ ${t('profil.light')}` : `🌙 ${t('profil.dark')}`}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Langue ── */}
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t('profil.language')}
          </ThemedText>
          <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
            {(['fr', 'en'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.toggleOption, settings.language === lang && { backgroundColor: theme.backgroundSelected }]}
                onPress={() => updateSettings({ language: lang })}
              >
                <ThemedText type="small">{lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Déconnexion ── */}
          <View style={styles.spacer} />
          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: '#e53e3e' }]}
            onPress={logOut}
          >
            <ThemedText type="default" style={{ color: '#e53e3e' }}>{t('profil.signOut')}</ThemedText>
          </TouchableOpacity>

          {/* ── Date de création ── */}
          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('profil.memberSince')} {createdAtLabel}
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  content: { paddingHorizontal: 16 },
  sectionLabel: { marginTop: 24, marginBottom: 8 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  toggleOption: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  row: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  spacer: { height: 32 },
  signOutBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footer: { marginTop: 32, alignItems: 'center' },
});
