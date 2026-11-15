import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AppRoute, Language, UserRole } from '../types';
import { colors, radius, spacing } from '../theme/tokens';
import { AppText } from './ui';
import { text } from '../i18n/translations';

export function AppFrame({ language, role, route, onRoute, onToggleLanguage, children }: { language: Language; role: UserRole; route: AppRoute; onRoute: (route: AppRoute) => void; onToggleLanguage: () => void; children: React.ReactNode }) {
  const isUr = language === 'ur';
  const customerTabs: { key: AppRoute; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'home', icon: 'home-outline', label: 'home' },
    { key: 'bookings', icon: 'calendar-outline', label: 'bookings' },
    { key: 'profile', icon: 'person-outline', label: 'account' },
  ];
  const tabs = role === 'customer' ? customerTabs : role === 'provider'
    ? [{ key: 'provider' as AppRoute, icon: 'briefcase-outline' as const, label: 'providerRole' }, { key: 'profile' as AppRoute, icon: 'person-outline' as const, label: 'account' }]
    : [{ key: 'admin' as AppRoute, icon: 'grid-outline' as const, label: 'adminRole' }, { key: 'profile' as AppRoute, icon: 'person-outline' as const, label: 'account' }];
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <View style={[styles.header, isUr && styles.rtlRow]}>
      <View style={[styles.brandLockup, isUr && styles.rtlRow]}>
        <View style={styles.brandMark}><Ionicons name="home" size={18} color={colors.white} /></View>
        <View><AppText language={language} size={17} weight="bold" color={colors.forest}>{text(language, 'brand')}</AppText><AppText language={language} size={10} color={colors.muted}>{text(language, 'tagline')}</AppText></View>
      </View>
      <Pressable onPress={onToggleLanguage} accessibilityRole="button" accessibilityLabel={text(language, 'language')} style={[styles.languageButton, isUr && styles.rtlRow]}><Ionicons name="globe-outline" size={16} color={colors.forest} /><AppText language={language === 'ur' ? 'en' : 'ur'} size={12} weight="bold" color={colors.forest}>{text(language, 'language')}</AppText></Pressable>
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
    <View style={[styles.tabBar, isUr && styles.rtlRow]}>
      {tabs.map((tab) => {
        const active = route === tab.key || (route === 'tracking' && tab.key === 'bookings') || (route === 'booking' && tab.key === 'home');
        return <Pressable key={tab.key} onPress={() => onRoute(tab.key)} style={styles.tab}>
          <Ionicons name={tab.icon} size={20} color={active ? colors.jade : colors.muted} />
          <AppText language={language} size={10} weight={active ? 'bold' : 'regular'} color={active ? colors.jade : colors.muted}>{text(language, tab.label)}</AppText>
          {active ? <View style={styles.activeDot} /> : null}
        </Pressable>;
      })}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { height: 68, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: '#EDF0EB', backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  languageButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 34, gap: spacing.xl, maxWidth: 660, width: '100%', alignSelf: 'center' },
  tabBar: { minHeight: 70, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 5 },
  tab: { minWidth: 75, height: 58, alignItems: 'center', justifyContent: 'center', gap: 2 },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.jade, position: 'absolute', bottom: -1 },
  rtlRow: { flexDirection: 'row-reverse' },
});
