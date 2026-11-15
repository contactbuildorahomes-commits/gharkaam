import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text as RNText, TextProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Language } from '../types';
import { colors, font, radius, spacing } from '../theme/tokens';

export function AppText({ language = 'ur', style, size = 15, color = colors.ink, weight = 'regular', children, ...props }: TextProps & { language?: Language; size?: number; color?: string; weight?: 'regular' | 'medium' | 'bold' }) {
  return <RNText {...props} style={[{ color, fontSize: size, lineHeight: language === 'ur' ? Math.max(size * 1.9, 27) : size * 1.45, fontFamily: language === 'ur' ? font.urdu : (weight === 'bold' ? 'System' : 'System'), fontWeight: language === 'ur' ? '400' : weight === 'bold' ? '700' : weight === 'medium' ? '600' : '400', writingDirection: language === 'ur' ? 'rtl' : 'ltr', textAlign: language === 'ur' ? 'right' : 'left' }, style]}>{children}</RNText>;
}

export function Button({ title, onPress, variant = 'primary', icon, language = 'ur', disabled = false, style }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'; icon?: keyof typeof Ionicons.glyphMap; language?: Language; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const bg = variant === 'primary' ? colors.forest : variant === 'secondary' ? colors.lime : variant === 'danger' ? colors.redSoft : 'transparent';
  const fg = variant === 'primary' ? colors.white : variant === 'danger' ? colors.red : colors.forest;
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, language === 'ur' && styles.rtlButton, { backgroundColor: bg, borderColor: variant === 'outline' ? colors.line : bg, borderWidth: variant === 'outline' ? 1 : 0, opacity: disabled ? 0.5 : pressed ? 0.78 : 1 }, style]}>
    {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
    <AppText language={language} color={fg} size={14} weight="bold">{title}</AppText>
  </Pressable>;
}

export function Card({ children, style, elevated = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; elevated?: boolean }) {
  return <View style={[styles.card, elevated && styles.elevated, style]}>{children}</View>;
}

export function Pill({ label, tone = 'mint', language = 'ur' }: { label: string; tone?: 'mint' | 'orange' | 'blue' | 'red' | 'neutral'; language?: Language }) {
  const palette = tone === 'orange' ? [colors.orangeSoft, '#A95C20'] : tone === 'blue' ? [colors.blueSoft, '#3866AE'] : tone === 'red' ? [colors.redSoft, colors.red] : tone === 'neutral' ? ['#F0F2EF', colors.inkSoft] : [colors.mint, colors.forest];
  return <View style={[styles.pill, { backgroundColor: palette[0] }]}><AppText language={language} color={palette[1]} size={11} weight="bold">{label}</AppText></View>;
}

export function ScreenTitle({ eyebrow, title, subtitle, language = 'ur', trailing }: { eyebrow?: string; title: string; subtitle?: string; language?: Language; trailing?: React.ReactNode }) {
  return <View style={[styles.titleRow, language === 'ur' && styles.rtlRow]}>
    <View style={{ flex: 1 }}>
      {eyebrow ? <AppText language={language} size={11} color={colors.jade} weight="bold">{eyebrow.toUpperCase()}</AppText> : null}
      <AppText language={language} size={23} weight="bold" style={{ marginTop: 3 }}>{title}</AppText>
      {subtitle ? <AppText language={language} size={13} color={colors.muted} style={{ marginTop: 2 }}>{subtitle}</AppText> : null}
    </View>
    {trailing}
  </View>;
}

export function IconCircle({ name, color = colors.forest, background = colors.mint, size = 42 }: { name: keyof typeof Ionicons.glyphMap; color?: string; background?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={name} size={size * 0.48} color={color} /></View>;
}

export function Stars({ value, size = 14, color = '#D89236' }: { value: number; size?: number; color?: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Ionicons name="star" size={size} color={color} /><RNText style={{ fontSize: size, fontWeight: '700', color: colors.ink, marginLeft: 2 }}>{value.toFixed(1)}</RNText></View>;
}

export function formatPKR(value: number): string {
  return `Rs ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(value)}`;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  elevated: { shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }, rtlButton: { flexDirection: 'row-reverse' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  rtlRow: { flexDirection: 'row-reverse' },
});
