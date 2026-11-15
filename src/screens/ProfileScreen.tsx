import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppUser, Language, UserRole } from '../types';
import { colors, radius, spacing } from '../theme/tokens';
import { AppText, Button, Card, IconCircle, Pill, ScreenTitle } from '../components/ui';
import { text } from '../i18n/translations';

export function ProfileScreen({ language, user, role, isDemo, onLeave, onChangeRole }: { language: Language; user: AppUser | null; role: UserRole; isDemo: boolean; onLeave: () => void; onChangeRole: () => void }) {
  const ur = language === 'ur';
  const roleName = role === 'customer' ? text(language, 'customerRole') : role === 'provider' ? text(language, 'providerRole') : text(language, 'adminRole');
  return <View style={{ gap: spacing.lg }}>
    <ScreenTitle title={text(language, 'account')} subtitle={language === 'ur' ? 'آپ کی پروفائل اور سیٹنگز' : 'Your profile and preferences'} />
    <Card style={styles.profile}><View style={[styles.profileTop, ur && styles.rtlRow]}><View style={styles.avatar}><AppText language="ur" size={24} weight="bold" color={colors.forest}>{(user?.displayName ?? 'احمد').slice(0, 1)}</AppText></View><View style={{ flex: 1 }}><AppText language={language} size={17} weight="bold">{user?.displayName ?? (ur ? 'احمد خان' : 'Ahmad Khan')}</AppText><AppText language="en" size={11} color={colors.muted}>{user?.email ?? 'ahmad.khan@example.pk'}</AppText></View><Pill language={language} label={isDemo ? 'DEMO' : roleName} tone={isDemo ? 'orange' : 'mint'} /></View><View style={styles.divider} /><View style={[styles.row, ur && styles.rtlRow]}><Ionicons name="briefcase-outline" size={17} color={colors.jade} /><AppText language={language} size={12} color={colors.inkSoft}>{roleName}</AppText></View><View style={[styles.row, ur && styles.rtlRow]}><Ionicons name="location-outline" size={17} color={colors.jade} /><AppText language={language} size={12} color={colors.inkSoft}>{text(language, 'location')}</AppText></View></Card>
    {role === 'provider' && user?.providerStatus === 'pending' ? <View style={styles.pending}><Ionicons name="time-outline" size={17} color="#A95C20" /><AppText language={language} size={11} color="#A95C20">{text(language, 'approvalPending')}</AppText></View> : null}
    <Card style={{ gap: 12 }}><AppText language={language} size={14} weight="bold">{language === 'ur' ? 'ایپ کی سیٹنگز' : 'App settings'}</AppText><View style={[styles.settingRow, ur && styles.rtlRow]}><IconCircle name="language-outline" size={36} /><View style={{ flex: 1 }}><AppText language={language} size={12} weight="bold">{text(language, 'language')}</AppText><AppText language={language} size={10} color={colors.muted}>{language === 'ur' ? 'پہلے سے اردو منتخب ہے' : 'Urdu is the default language'}</AppText></View><Ionicons name={ur ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.muted} /></View><View style={[styles.settingRow, ur && styles.rtlRow]}><IconCircle name="shield-checkmark-outline" size={36} background={colors.blueSoft} color={colors.blue} /><View style={{ flex: 1 }}><AppText language={language} size={12} weight="bold">{language === 'ur' ? 'رازداری اور تحفظ' : 'Privacy & security'}</AppText><AppText language={language} size={10} color={colors.muted}>{language === 'ur' ? 'آپ کا ڈیٹا محفوظ ہے' : 'Your data is protected'}</AppText></View><Ionicons name={ur ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.muted} /></View></Card>
    {isDemo ? <Button language={language} title={text(language, 'switchRole')} icon="swap-horizontal" variant="outline" onPress={onChangeRole} /> : null}
    <Button language={language} title={text(language, 'signOut')} icon="log-out-outline" variant="danger" onPress={onLeave} />
    <AppText language={language} size={10} color={colors.muted} style={{ textAlign: 'center' }}>GharKaam · Version 1.0.0 · {text(language, 'demoLabel')}</AppText>
  </View>;
}

const styles = StyleSheet.create({ profile: { gap: 13 }, profileTop: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, divider: { height: 1, backgroundColor: colors.line }, row: { flexDirection: 'row', alignItems: 'center', gap: 9 }, pending: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.orangeSoft, padding: 11, borderRadius: 13 }, settingRow: { minHeight: 47, flexDirection: 'row', alignItems: 'center', gap: 10 }, rtlRow: { flexDirection: 'row-reverse' }, });
