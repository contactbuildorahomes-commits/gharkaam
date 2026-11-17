import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Booking, Language } from '../types';
import { colors, radius, spacing } from '../theme/tokens';
import { AppText, Button, Card, Pill, ScreenTitle, Stars, formatPKR } from '../components/ui';
import { text } from '../i18n/translations';

const statusTone = (status: Booking['status']): 'mint' | 'orange' | 'blue' | 'red' => status === 'completed' ? 'mint' : status === 'cancelled' ? 'red' : status === 'accepted' || status === 'on_the_way' || status === 'in_progress' ? 'blue' : 'orange';

export function BookingsScreen({ language, bookings, onTrack, onRate }: { language: Language; bookings: Booking[]; onTrack: (booking: Booking) => void; onRate: (booking: Booking, value: number) => void }) {
  const ur = language === 'ur';
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const rows = bookings.filter((item) => filter === 'all' || (filter === 'active' ? !['completed', 'cancelled'].includes(item.status) : item.status === 'completed'));
  return <View style={{ gap: spacing.lg }}>
    <ScreenTitle eyebrow={text(language, 'recent')} title={text(language, 'bookings')} subtitle={language === 'ur' ? 'اپنی موجودہ اور پرانی سروسز دیکھیں' : 'Your current and past service requests'} />
    <View style={[styles.filterRow, ur && styles.rtlRow]}>{(['all', 'active', 'completed'] as const).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><AppText language={language} size={11} weight={filter === item ? 'bold' : 'regular'} color={filter === item ? colors.forest : colors.muted}>{item === 'all' ? text(language, 'seeAll') : item === 'active' ? text(language, 'active') : text(language, 'completed')}</AppText></Pressable>)}</View>
    {rows.length === 0 ? <Card style={styles.empty}><Ionicons name="calendar-outline" size={30} color={colors.muted} /><AppText language={language} size={15} weight="bold">{text(language, 'noBookings')}</AppText><AppText language={language} size={12} color={colors.muted}>{language === 'ur' ? 'گھر کی مرمت کے لیے نئی بکنگ شروع کریں۔' : 'Start a new booking for your home repair.'}</AppText></Card> : rows.map((booking) => <Card key={booking.id} style={styles.booking}>
      <View style={[styles.topLine, ur && styles.rtlRow]}><View style={{ flex: 1 }}><AppText language={language} size={15} weight="bold">{ur ? booking.serviceNameUr : booking.serviceNameEn}</AppText><AppText language={language} size={11} color={colors.muted}>{ur ? booking.subtypeUr : booking.subtypeEn}</AppText></View><Pill language={language} label={text(language, booking.status)} tone={statusTone(booking.status)} /></View>
      <View style={styles.divider} /><View style={[styles.detailLine, ur && styles.rtlRow]}><Ionicons name="person-circle-outline" size={17} color={colors.jade} /><AppText language={language} size={11} color={colors.inkSoft}>{booking.providerName || (booking.preferredProviderName ? (ur ? `ترجیح: ${booking.preferredProviderName}` : `Preference: ${booking.preferredProviderName}`) : text(language, 'pending'))}</AppText><View style={{ flex: 1 }} /><AppText language="en" size={12} weight="bold">{formatPKR(booking.price)}</AppText></View>
      <View style={[styles.detailLine, ur && styles.rtlRow]}><Ionicons name="location-outline" size={16} color={colors.muted} /><AppText language={language} size={10} color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>{booking.address}</AppText><AppText language="en" size={10} color={colors.muted}>{new Date(booking.scheduledAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</AppText></View>
      <View style={[styles.actions, ur && styles.rtlRow]}><Button language={language} title={text(language, 'tracking')} icon="navigate-outline" variant="outline" onPress={() => onTrack(booking)} style={{ flex: 1, minHeight: 40 }} />{booking.status === 'completed' ? (booking.rating ? <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}><Stars value={booking.rating} /></View> : <View style={[styles.rateRow, ur && styles.rtlRow]}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} onPress={() => { setRatings({ ...ratings, [booking.id]: value }); onRate(booking, value); }}><Ionicons name="star" size={21} color={(ratings[booking.id] ?? 0) >= value ? '#E8A64C' : '#CBD5CE'} /></Pressable>)}</View>) : null}</View>
    </Card>)}
  </View>;
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', backgroundColor: '#ECEFE9', borderRadius: 14, padding: 4, gap: 4 }, filter: { flex: 1, minHeight: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, filterActive: { backgroundColor: colors.white, shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  empty: { minHeight: 180, justifyContent: 'center', alignItems: 'center', gap: 8 }, booking: { gap: 9, padding: 14 }, topLine: { flexDirection: 'row', alignItems: 'center', gap: 10 }, divider: { height: 1, backgroundColor: colors.line }, detailLine: { flexDirection: 'row', alignItems: 'center', gap: 6 }, actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }, rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', flex: 1 }, rtlRow: { flexDirection: 'row-reverse' },
});
