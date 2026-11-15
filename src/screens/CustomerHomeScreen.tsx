import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Booking, Language, ServiceCategory } from '../types';
import { categories } from '../data/mock';
import { colors, radius, spacing } from '../theme/tokens';
import { AppText, Button, Card, IconCircle, Pill, ScreenTitle, formatPKR } from '../components/ui';
import { text } from '../i18n/translations';

export function CustomerHomeScreen({ language, name, bookings, onBook, onTrack, onBookings, serviceCategories = categories, promoAvailable = true }: { language: Language; name: string; bookings: Booking[]; onBook: (category?: ServiceCategory) => void; onTrack: (booking: Booking) => void; onBookings: () => void; serviceCategories?: ServiceCategory[]; promoAvailable?: boolean }) {
  const ur = language === 'ur';
  const active = bookings.find((booking) => !['completed', 'cancelled'].includes(booking.status));
  return <View style={{ gap: spacing.xl }}>
    <View style={[styles.greeting, ur && styles.rtlRow]}><View style={{ flex: 1 }}><AppText language={language} size={12} color={colors.muted}>{text(language, 'hello')},</AppText><AppText language={language} size={21} weight="bold">{name || (ur ? 'احمد خان' : 'Ahmad Khan')}</AppText><View style={[styles.location, ur && styles.rtlRow]}><Ionicons name="location" size={13} color={colors.jade} /><AppText language={language} size={11} color={colors.inkSoft}>{text(language, 'location')}</AppText></View></View><IconCircle name="notifications-outline" background={colors.white} size={42} color={colors.forest} /></View>
    <LinearGradient colors={[colors.forest, colors.forestDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.orb} /><View style={[styles.heroTag, ur && styles.rtlRow]}><Ionicons name="sparkles" size={14} color={colors.lime} /><AppText language={language} size={10} color={colors.lime} weight="bold">{language === 'ur' ? 'قابلِ اعتماد، آپ کے قریب' : 'TRUSTED HELP, CLOSE BY'}</AppText></View>
      <AppText language={language} size={24} weight="bold" color={colors.white} style={{ maxWidth: 260, marginTop: 9 }}>{text(language, 'howHelp')}</AppText>
      <AppText language={language} size={12} color="#D6E6DF" style={{ marginTop: 4 }}>{text(language, 'trusted')}</AppText>
      <Button language={language} title={text(language, 'bookNow')} icon="arrow-forward" variant="secondary" onPress={() => onBook()} style={styles.heroButton} />
      <View style={styles.heroIcon}><Ionicons name="build" size={25} color={colors.lime} /></View>
    </LinearGradient>
    {promoAvailable ? <View style={styles.promoCard}>
      <View style={styles.promoIcon}><Ionicons name="pricetag" size={18} color="#A45E22" /></View><View style={{ flex: 1 }}><AppText language={language} size={14} weight="bold">{text(language, 'promoTitle')}</AppText><AppText language={language} size={11} color={colors.inkSoft}>{language === 'ur' ? 'کوڈ' : 'Code'} {text(language, 'promoCode')}</AppText></View><Ionicons name={ur ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.muted} />
    </View> : null}
    <View style={{ gap: 13 }}>
      <ScreenTitle title={text(language, 'popular')} subtitle={text(language, 'services')} language={language} trailing={<Pressable onPress={() => onBook()}><AppText language={language} size={12} color={colors.jade} weight="bold">{text(language, 'seeAll')}</AppText></Pressable>} />
      <View style={styles.categoryGrid}>{serviceCategories.map((item) => <ServiceTile key={item.id} category={item} language={language} onPress={() => item.available && onBook(item)} />)}</View>
    </View>
    {active ? <View style={{ gap: 9 }}><ScreenTitle title={text(language, 'activeJobs')} language={language} trailing={<Pressable onPress={onBookings}><AppText language={language} size={12} color={colors.jade} weight="bold">{text(language, 'seeAll')}</AppText></Pressable>} /><Pressable onPress={() => onTrack(active)}><Card style={styles.bookingCard}><View style={[styles.bookingTop, ur && styles.rtlRow]}><IconCircle name={active.serviceId === 'plumber' ? 'water' : 'flash'} size={42} /><View style={{ flex: 1 }}><AppText language={language} size={14} weight="bold">{ur ? active.serviceNameUr : active.serviceNameEn}</AppText><AppText language={language} size={11} color={colors.muted}>{active.providerName || text(language, 'pending')} · {active.address}</AppText></View><Ionicons name={ur ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.muted} /></View><View style={styles.bookingBottom}><Pill label={text(language, active.status)} language={language} tone="orange" /><AppText language={language} size={12} weight="bold" color={colors.forest}>{formatPKR(active.price)}</AppText></View></Card></Pressable></View> : null}
    <View style={styles.howCard}><AppText language={language} size={15} weight="bold">{text(language, 'howItWorks')}</AppText><View style={[styles.howSteps, ur && styles.rtlRow]}>{['1', '2', '3'].map((num, index) => <View key={num} style={styles.howStep}><View style={styles.stepNumber}><AppText language="en" size={11} weight="bold" color={colors.forest}>{num}</AppText></View><AppText language={language} size={10} color={colors.inkSoft} style={{ textAlign: 'center' }}>{[text(language, 'chooseService'), text(language, 'chooseProvider'), text(language, 'confirmation')][index]}</AppText></View>)}</View></View>
  </View>;
}

function ServiceTile({ category, language, onPress }: { category: ServiceCategory; language: Language; onPress: () => void }) {
  const name = language === 'ur' ? category.titleUr : category.titleEn;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.serviceTile, { backgroundColor: colors.white, opacity: pressed ? 0.75 : 1 }]}>
    <View style={[styles.tileIcon, { backgroundColor: category.color }]}><Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={22} color={category.id === 'plumber' ? colors.blue : category.id === 'electrician' ? '#B66B2D' : colors.jade} /></View>
    <AppText language={language} size={12} weight="bold" style={{ textAlign: 'center' }}>{name}</AppText>
    {!category.available ? <View style={styles.coming}><AppText language={language} size={8} color={colors.muted}>SOON</AppText></View> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  greeting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, location: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  hero: { padding: 20, borderRadius: radius.lg, minHeight: 208, overflow: 'hidden' }, orb: { position: 'absolute', right: -56, top: -65, width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTag: { flexDirection: 'row', gap: 6, alignItems: 'center' }, heroButton: { alignSelf: 'flex-start', marginTop: 16, minHeight: 42 }, heroIcon: { position: 'absolute', right: 26, bottom: 30, width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(214,240,122,0.12)', alignItems: 'center', justifyContent: 'center' },
  promoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, borderWidth: 1, borderColor: '#F1DEC7', backgroundColor: '#FFF9F1', padding: 14 }, promoIcon: { height: 38, width: 38, borderRadius: 13, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, serviceTile: { width: '48%', flexGrow: 1, minHeight: 120, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, position: 'relative' },
  tileIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, coming: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#F1F3F0', borderRadius: 99 },
  bookingCard: { padding: 13 }, bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, bookingBottom: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  howCard: { borderRadius: radius.md, backgroundColor: '#EFF3EA', padding: 15, gap: 12 }, howSteps: { flexDirection: 'row', justifyContent: 'space-between' }, howStep: { flex: 1, alignItems: 'center', gap: 6 }, stepNumber: { width: 25, height: 25, borderRadius: 12.5, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  rtlRow: { flexDirection: 'row-reverse' },
});
