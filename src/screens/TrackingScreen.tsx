import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Booking, Language } from '../types';
import { colors, spacing } from '../theme/tokens';
import { AppText, Button, Card, IconCircle, Pill, formatPKR } from '../components/ui';
import { text } from '../i18n/translations';

const timeline = ['pending', 'accepted', 'on_the_way', 'in_progress', 'completed'] as const;
const statusIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: 'hourglass-outline', accepted: 'checkmark', on_the_way: 'bicycle-outline',
  in_progress: 'construct-outline', completed: 'checkmark-done-outline', cancelled: 'close',
};

export function TrackingScreen({ language, booking, isDemo, onBack }: { language: Language; booking: Booking; isDemo: boolean; onBack: () => void }) {
  const ur = language === 'ur';
  const currentIndex = timeline.indexOf(booking.status as typeof timeline[number]);
  const cancelled = booking.status === 'cancelled';
  const assigned = Boolean(booking.providerId && booking.providerName);
  const preferred = !assigned && Boolean(booking.preferredProviderName);
  const providerLabel = assigned ? booking.providerName
    : preferred ? (ur ? `ترجیح: ${booking.preferredProviderName}` : `Preference: ${booking.preferredProviderName}`)
      : text(language, 'noProviderPreference');

  return <View style={{ gap: spacing.lg }}>
    <View style={[styles.heading, ur && styles.rtlRow]}>
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel={text(language, 'back')}>
        <Ionicons name={ur ? 'arrow-forward' : 'arrow-back'} size={18} color={colors.forest} />
      </Pressable>
      <View style={{ flex: 1 }}><AppText language={language} size={20} weight="bold">{text(language, 'tracking')}</AppText><AppText language="en" size={11} color={colors.muted}>#{booking.id}</AppText></View>
      <Pill language={language} label={text(language, booking.status)} tone={cancelled ? 'red' : booking.status === 'completed' ? 'mint' : booking.status === 'pending' ? 'orange' : 'blue'} />
    </View>

    <Card style={styles.statusHero}>
      <View style={[styles.heroTop, ur && styles.rtlRow]}>
        <IconCircle name={statusIcon[booking.status] ?? 'help-circle-outline'} background={cancelled ? colors.redSoft : colors.mint} color={cancelled ? colors.red : colors.jade} size={50} />
        <View style={{ flex: 1 }}><AppText language={language} size={16} weight="bold">{text(language, booking.status)}</AppText><AppText language={language} size={11} color={colors.muted}>{ur ? 'اپ ڈیٹ' : 'Last update'} · {new Date(booking.createdAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}</AppText></View>
      </View>
      {!cancelled ? <View style={styles.timeline}>
        {timeline.map((key, index) => {
          const done = index <= currentIndex;
          return <View key={key} style={[styles.timelineItem, ur && styles.rtlRow]}>
            <View style={styles.timelineRail}><View style={[styles.node, done && styles.nodeDone]}>{done ? <Ionicons name="checkmark" size={11} color={colors.white} /> : <View style={styles.nodeEmpty} />}</View>{index !== timeline.length - 1 ? <View style={[styles.connector, index < currentIndex && styles.connectorDone]} /> : null}</View>
            <View style={[styles.timelineText, { opacity: done ? 1 : 0.55 }]}><AppText language={language} size={12} weight={done && index === currentIndex ? 'bold' : 'regular'}>{text(language, key)}</AppText>{index === currentIndex ? <AppText language={language} size={10} color={colors.muted}>{ur ? 'تازہ ترین مرحلہ' : 'Current step'}</AppText> : null}</View>
          </View>;
        })}
      </View> : <AppText language={language} size={12} color={colors.red}>{text(language, 'cancelled')}</AppText>}
    </Card>

    <Card style={styles.providerCard}>
      <View style={[styles.providerRow, ur && styles.rtlRow]}>
        <View style={styles.avatar}><AppText language="ur" size={18} weight="bold" color={colors.forest}>{(booking.providerName || booking.preferredProviderName || '؟').slice(0, 1)}</AppText></View>
        <View style={{ flex: 1 }}>
          <AppText language={language} size={14} weight="bold">{providerLabel}</AppText>
          <View style={[styles.providerStatus, ur && styles.rtlRow]}><Ionicons name={assigned ? 'checkmark-circle' : 'time-outline'} size={13} color={assigned ? colors.jade : colors.muted} /><AppText language={language} size={10} color={assigned ? colors.jade : colors.muted}>{assigned ? (isDemo ? text(language, 'sampleProfile') : text(language, 'verified')) : text(language, 'pending')}</AppText></View>
        </View>
      </View>
      {!assigned ? <AppText language={language} size={10} color={colors.muted}>{text(language, preferred ? (isDemo ? 'demoPreferenceHint' : 'providerPreferencePending') : (isDemo ? 'noProviderAssignedHint' : 'providerAssignmentHint'))}</AppText> : null}
      <View style={styles.divider} />
      <InfoLine language={language} icon="location-outline" value={booking.address} />
      <InfoLine language="en" icon="time-outline" value={new Date(booking.scheduledAt).toLocaleString('en-PK', { weekday: 'short', hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })} />
      <View style={[styles.infoLine, ur && styles.rtlRow]}><Ionicons name="cash-outline" size={16} color={colors.muted} /><AppText language={language} size={11} color={colors.inkSoft}>{text(language, 'cash')}</AppText><View style={{ flex: 1 }} /><AppText language="en" size={13} weight="bold" color={colors.forest}>{formatPKR(booking.price)}</AppText></View>
      <AppText language={language} size={10} color={colors.muted}>{text(language, 'cashOnlyNotice')}</AppText>
    </Card>

    {booking.status === 'completed' && !booking.rating ? <Card style={styles.rating}>
      <AppText language={language} size={15} weight="bold">{text(language, 'rateProvider')}</AppText>
      <AppText language={language} size={11} color={colors.muted}>{ur ? 'آپ کی رائے کمیونٹی کی مدد کرتی ہے۔' : 'Your feedback helps the community.'}</AppText>
      <Button language={language} title={text(language, 'submitRating')} icon="star" onPress={onBack} />
    </Card> : null}
    {isDemo ? <View style={[styles.demo, ur && styles.rtlRow]}><Ionicons name="information-circle-outline" size={15} color={colors.jade} /><AppText language={language} size={10} color={colors.inkSoft}>{text(language, 'demoLabel')}</AppText></View> : <View style={[styles.demo, ur && styles.rtlRow]}><Ionicons name="information-circle-outline" size={15} color={colors.muted} /><AppText language={language} size={10} color={colors.muted}>{text(language, 'noLiveTracking')}</AppText></View>}
  </View>;
}

function InfoLine({ language, icon, value }: { language: Language; icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return <View style={[styles.infoLine, language === 'ur' && styles.rtlRow]}><Ionicons name={icon} size={16} color={colors.muted} /><AppText language={language} size={11} color={colors.inkSoft} style={{ flex: 1 }}>{value}</AppText></View>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 39, height: 39, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  statusHero: { gap: 13 }, heroTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  timeline: { paddingTop: 6 }, timelineItem: { minHeight: 48, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineRail: { width: 21, alignItems: 'center', alignSelf: 'stretch' }, node: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#E5EAE4', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  nodeDone: { backgroundColor: colors.jade }, nodeEmpty: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#AAB6AE' },
  connector: { position: 'absolute', width: 2, top: 18, bottom: -1, backgroundColor: '#E5EAE4' }, connectorDone: { backgroundColor: colors.jade },
  timelineText: { flex: 1, paddingBottom: 7 }, providerCard: { gap: 12 }, providerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  providerStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }, divider: { height: 1, backgroundColor: colors.line },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 }, rating: { gap: 10 }, demo: { flexDirection: 'row', alignItems: 'center', gap: 6 }, rtlRow: { flexDirection: 'row-reverse' },
});
