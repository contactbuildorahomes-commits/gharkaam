import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Language, UserRole } from '../types';
import { colors, radius, spacing } from '../theme/tokens';
import { AppText, Button, Card, IconCircle } from '../components/ui';
import { text } from '../i18n/translations';

const roles: { role: UserRole; icon: keyof typeof Ionicons.glyphMap; title: string; caption: string; color: string }[] = [
  { role: 'customer', icon: 'home-outline', title: 'customerRole', caption: 'customerCaption', color: colors.mint },
  { role: 'provider', icon: 'construct-outline', title: 'providerRole', caption: 'providerCaption', color: colors.orangeSoft },
  { role: 'admin', icon: 'shield-checkmark-outline', title: 'adminRole', caption: 'adminCaption', color: colors.blueSoft },
];

export function RoleSelectScreen({ language, onToggleLanguage, onDemo, onLogin }: { language: Language; onToggleLanguage: () => void; onDemo: (role: UserRole) => void; onLogin: (role: UserRole) => void }) {
  const isUr = language === 'ur';
  return <View style={styles.page}>
    <View style={[styles.top, isUr && styles.rtlRow]}>
      <View style={[styles.brand, isUr && styles.rtlRow]}><View style={styles.brandMark}><Ionicons name="home" color={colors.white} size={21} /></View><View><AppText language={language} size={23} weight="bold" color={colors.forest}>{text(language, 'brand')}</AppText><AppText language={language} size={11} color={colors.muted}>{text(language, 'tagline')}</AppText></View></View>
      <Pressable onPress={onToggleLanguage} accessibilityRole="button" accessibilityLabel={text(language, 'language')} style={[styles.language, isUr && styles.rtlRow]}><Ionicons name="globe-outline" size={16} color={colors.forest} /><AppText language={language === 'ur' ? 'en' : 'ur'} size={12} color={colors.forest} weight="bold">{text(language, 'language')}</AppText></Pressable>
    </View>
    <View style={styles.content}>
      <LinearGradient colors={[colors.forest, colors.forestDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroOrbOne} /><View style={styles.heroOrbTwo} />
        <View style={styles.heroTag}><View style={styles.heroDot} /><AppText language={language} size={10} color={colors.lime} weight="bold">LAHORE • LOCAL EXPERTS</AppText></View>
        <AppText language={language} size={27} color={colors.white} weight="bold" style={{ maxWidth: 280, marginTop: 12 }}>{text(language, 'welcome')}</AppText>
        <AppText language={language} size={13} color="#D4E5DB" style={{ maxWidth: 300, marginTop: 7 }}>{text(language, 'welcomeSub')}</AppText>
        <View style={[styles.heroFoot, isUr && styles.rtlRow]}><Ionicons name="checkmark-circle" size={16} color={colors.lime} /><AppText language={language} size={11} color="#E9F4EA">{text(language, 'trusted')}</AppText></View>
      </LinearGradient>
      <View style={styles.sectionHead}><AppText language={language} size={18} weight="bold">{language === 'ur' ? 'اپنا راستہ منتخب کریں' : 'Choose your journey'}</AppText><AppText language={language} size={12} color={colors.muted}>{language === 'ur' ? 'ہر کردار کا الگ ورک فلو' : 'Separate workflows for each role'}</AppText></View>
      <View style={styles.roleList}>
        {roles.map((item) => <Card key={item.role} style={styles.roleCard}>
          <View style={[styles.roleTop, isUr && styles.rtlRow]}>
            <IconCircle name={item.icon} background={item.color} size={46} />
            <View style={{ flex: 1 }}><AppText language={language} size={16} weight="bold">{text(language, item.title)}</AppText><AppText language={language} size={11} color={colors.muted}>{text(language, item.caption)}</AppText></View>
            {item.role === 'admin' ? <View style={styles.lockMark}><Ionicons name="lock-closed" size={12} color={colors.blue} /></View> : null}
          </View>
          <View style={[styles.actions, isUr && styles.rtlRow]}>
            <Button language={language} title={text(language, 'signInTo')} icon="log-in-outline" variant="outline" onPress={() => onLogin(item.role)} style={styles.actionButton} />
            {item.role !== 'admin' ? <Button language={language} title={text(language, 'demo')} onPress={() => onDemo(item.role)} variant="secondary" style={styles.actionButton} /> : <Button language={language} title={language === 'ur' ? 'ڈیمو پیش نظارہ' : 'Demo preview'} icon="eye-outline" onPress={() => onDemo(item.role)} variant="secondary" style={styles.actionButton} />}
          </View>
        </Card>)}
      </View>
      <View style={styles.note}><Ionicons name="information-circle-outline" size={17} color={colors.jade} /><AppText language={language} size={11} color={colors.inkSoft} style={{ flex: 1 }}>{text(language, 'demoLabel')}</AppText></View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  top: { paddingHorizontal: spacing.xl, paddingTop: 17, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 }, brandMark: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  language: { flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 8, alignItems: 'center' },
  content: { width: '100%', maxWidth: 650, alignSelf: 'center', paddingHorizontal: spacing.xl, paddingBottom: 30, gap: spacing.lg },
  hero: { borderRadius: radius.lg, paddingHorizontal: 23, paddingVertical: 22, overflow: 'hidden', minHeight: 200, justifyContent: 'center' },
  heroOrbOne: { width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.055)', position: 'absolute', right: -78, top: -86 },
  heroOrbTwo: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(214,240,122,0.08)', position: 'absolute', right: 65, bottom: -75 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 7 }, heroDot: { width: 6, height: 6, backgroundColor: colors.lime, borderRadius: 3 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 15 },
  sectionHead: { gap: 2, marginTop: 1 }, roleList: { gap: 11 }, roleCard: { padding: 14 }, roleTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  lockMark: { width: 25, height: 25, borderRadius: 9, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 13 }, actionButton: { flex: 1, minHeight: 42, paddingHorizontal: 7 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.mint, padding: 12, borderRadius: radius.md },
  rtlRow: { flexDirection: 'row-reverse' },
});
