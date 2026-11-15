import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppUser, Language, UserRole } from '../types';
import { signInOrRegister } from '../lib/auth';
import { colors, radius, spacing } from '../theme/tokens';
import { AppText, Button, Card, IconCircle } from '../components/ui';
import { text } from '../i18n/translations';

export function AuthScreen({ language, role, onBack, onSuccess }: { language: Language; role: UserRole; onBack: () => void; onSuccess: (user: AppUser) => void }) {
  const [register, setRegister] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const ur = language === 'ur';
  const roleKey = role === 'customer' ? 'customerRole' : role === 'provider' ? 'providerRole' : 'adminRole';
  const submit = async () => {
    setMessage(''); setIsError(false); setBusy(true);
    const result = await signInOrRegister({ email, password, displayName, role, register });
    setBusy(false);
    if (result.error) { setMessage(result.error); setIsError(true); return; }
    if (result.pendingConfirmation) { setMessage(language === 'ur' ? 'اکاؤنٹ کی تصدیق کے لیے اپنا ای میل چیک کریں۔' : 'Check your email to confirm your account, then sign in.'); return; }
    if (result.user) onSuccess(result.user);
  };
  return <View style={styles.page}>
    <View style={[styles.top, ur && styles.rtlRow]}><Pressable onPress={onBack} style={styles.back}><Ionicons name={ur ? 'arrow-forward' : 'arrow-back'} size={19} color={colors.forest} /></Pressable><AppText language={language} size={14} color={colors.inkSoft}>{text(language, 'back')}</AppText><View style={{ flex: 1 }} /><AppText language={language} size={17} weight="bold" color={colors.forest}>{text(language, 'brand')}</AppText></View>
    <View style={styles.body}>
      <IconCircle name={role === 'customer' ? 'home-outline' : role === 'provider' ? 'construct-outline' : 'shield-checkmark-outline'} size={56} background={colors.mint} />
      <AppText language={language} size={25} weight="bold" style={{ marginTop: 18 }}>{register ? text(language, 'register') : text(language, 'login')}</AppText>
      <AppText language={language} size={13} color={colors.muted}>{text(language, roleKey)} · {text(language, register ? 'register' : 'signInTo')}</AppText>
      <Card style={styles.form}>
        {register && role !== 'admin' ? <Input label={text(language, 'name')} value={displayName} onChangeText={setDisplayName} language={language} icon="person-outline" /> : null}
        <Input label={text(language, 'email')} value={email} onChangeText={setEmail} language={language} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
        <Input label={text(language, 'password')} value={password} onChangeText={setPassword} language={language} icon="lock-closed-outline" secureTextEntry />
        {role === 'admin' ? <View style={styles.adminNote}><Ionicons name="lock-closed" size={15} color={colors.blue} /><AppText language={language} size={12} color={colors.inkSoft} style={{ flex: 1 }}>{text(language, 'noSignupAdmin')}</AppText></View> : null}
        {message ? <View style={[styles.message, isError && styles.error]}><AppText language={language} size={12} color={isError ? colors.red : colors.forest}>{message}</AppText></View> : null}
        <Button language={language} title={busy ? (language === 'ur' ? 'انتظار کریں…' : 'Please wait…') : register ? text(language, 'register') : text(language, 'login')} icon="arrow-forward" onPress={submit} disabled={busy || !email || !password || (register && role !== 'admin' && !displayName.trim())} style={{ marginTop: 4 }} />
      </Card>
      {role !== 'admin' ? <View style={[styles.toggleLine, ur && styles.rtlRow]}><AppText language={language} size={12} color={colors.muted}>{register ? (language === 'ur' ? 'پہلے سے اکاؤنٹ ہے؟' : 'Already have an account?') : (language === 'ur' ? 'نئے ہیں؟' : 'New here?')}</AppText><Pressable onPress={() => { setRegister(!register); setMessage(''); }}><AppText language={language} size={12} color={colors.jade} weight="bold">{register ? text(language, 'login') : text(language, 'register')}</AppText></Pressable></View> : null}
      <AppText language={language} size={11} color={colors.muted} style={{ textAlign: 'center', marginTop: 18 }}>{language === 'ur' ? 'اکاؤنٹ ڈیٹا محفوظ طریقے سے Supabase میں رکھا جاتا ہے۔' : 'Account data is stored securely in Supabase.'}</AppText>
    </View>
  </View>;
}

function Input({ label, value, onChangeText, language, icon, ...props }: { label: string; value: string; onChangeText: (v: string) => void; language: Language; icon: keyof typeof Ionicons.glyphMap } & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText'>) {
  const ur = language === 'ur';
  return <View style={{ gap: 6 }}><AppText language={language} size={12} color={colors.inkSoft} weight="medium">{label}</AppText><View style={[styles.inputWrap, ur && styles.rtlRow]}><Ionicons name={icon} size={17} color={colors.muted} /><TextInput value={value} onChangeText={onChangeText} placeholder={label} placeholderTextColor="#A3B0AA" autoCorrect={false} style={[styles.input, { textAlign: ur ? 'right' : 'left', writingDirection: ur ? 'rtl' : 'ltr' }]} {...props} /></View></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream }, top: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: 9 }, back: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  body: { flex: 1, width: '100%', maxWidth: 500, alignSelf: 'center', padding: spacing.xl, paddingTop: 20 }, form: { marginTop: 21, gap: 15 }, inputWrap: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FCFDFB', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, input: { flex: 1, paddingVertical: 10, color: colors.ink, fontSize: 14, outlineStyle: 'none' as any },
  adminNote: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.blueSoft, padding: 11, borderRadius: 12 }, message: { backgroundColor: colors.mint, padding: 10, borderRadius: 12 }, error: { backgroundColor: colors.redSoft }, toggleLine: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 17 },
  rtlRow: { flexDirection: 'row-reverse' },
});
