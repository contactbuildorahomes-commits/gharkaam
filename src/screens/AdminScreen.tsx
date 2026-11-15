import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppUser, Booking, BookingStatus, Language, Provider, SessionMode } from '../types';
import { categories, providerApplications } from '../data/mock';
import { supabase } from '../lib/supabase';
import { setCategoryActive, setPromoActive, setProviderApproval } from '../data/repository';
import { colors, radius, spacing } from '../theme/tokens';
import { AppText, Button, Card, IconCircle, Pill, ScreenTitle } from '../components/ui';
import { text } from '../i18n/translations';

export function AdminScreen({ language, user, mode, bookings, onBookingStatus }: { language: Language; user: AppUser | null; mode: SessionMode; bookings: Booking[]; onBookingStatus: (booking: Booking, status: BookingStatus) => Promise<void> }) {
  const ur = language === 'ur';
  const [applications, setApplications] = useState<Provider[]>(mode === 'demo' ? providerApplications : []);
  const [serviceToggles, setServiceToggles] = useState<Record<string, boolean>>({ electrician: true, plumber: true, appliance: false, ac: false });
  const [promoOn, setPromoOn] = useState(true);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (mode !== 'authenticated' || !supabase) return;
    let mounted = true;
    supabase.from('providers').select('id, full_name, service_category_ids, verification_status, rating, review_count, completed_jobs, years_experience').eq('verification_status', 'pending').then(({ data }) => {
      if (!mounted || !data) return;
      setApplications(data.map((row: any) => ({ id: row.id, nameUr: row.full_name, nameEn: row.full_name, tradeUr: row.service_category_ids?.includes('plumber') ? 'پلمبر' : 'الیکٹریشن', tradeEn: row.service_category_ids?.includes('plumber') ? 'Plumber' : 'Electrician', rating: row.rating, reviews: row.review_count, completedJobs: row.completed_jobs, startingPrice: 0, eta: '—', verified: false, specialty: `${row.years_experience} years experience`, status: row.verification_status })));
    });
    return () => { mounted = false; };
  }, [mode]);
  const approve = async (provider: Provider, status: 'approved' | 'suspended' = 'approved') => {
    try {
      await setProviderApproval(provider.id, status, mode);
      setApplications((rows) => rows.filter((row) => row.id !== provider.id));
      setNotice(status === 'approved' ? (language === 'ur' ? 'پروفیشنل منظور ہو گیا۔' : 'Provider approved.') : (language === 'ur' ? 'پروفیشنل معطل کر دیا گیا۔' : 'Provider suspended.'));
    } catch (e: any) { setNotice(e?.message ?? 'Could not approve provider.'); }
  };
  const toggleCategory = async (id: string, value: boolean) => {
    try { await setCategoryActive(id, value, mode); setServiceToggles({ ...serviceToggles, [id]: value }); setNotice(''); }
    catch (e: any) { setNotice(e?.message ?? 'Could not update service.'); }
  };
  const togglePromo = async (value: boolean) => {
    try { await setPromoActive('PEHLI15', value, mode); setPromoOn(value); setNotice(''); }
    catch (e: any) { setNotice(e?.message ?? 'Could not update offer.'); }
  };
  const changeBookingStatus = async (booking: Booking) => {
    const next: BookingStatus = booking.status === 'pending' && booking.providerId ? 'accepted' : 'cancelled';
    try { await onBookingStatus(booking, next); setNotice(language === 'ur' ? 'بکنگ کی حیثیت اپ ڈیٹ ہو گئی۔' : 'Booking status updated.'); }
    catch (e: any) { setNotice(e?.message ?? 'Could not update booking.'); }
  };
  return <View style={{ gap: spacing.lg }}>
    <View style={styles.hero}><View style={[styles.heroHead, ur && styles.rtlRow]}><IconCircle name="shield-checkmark" background="rgba(255,255,255,0.12)" color={colors.lime} size={44} /><View style={{ flex: 1 }}><AppText language={language} size={19} weight="bold" color={colors.white}>{text(language, 'adminTitle')}</AppText><AppText language={language} size={10} color="#D4E5DB">{user?.email ?? (language === 'ur' ? 'ڈیمو ایڈمن • لاہور' : 'Demo admin · Lahore')}</AppText></View><Pill label={mode === 'demo' ? 'DEMO' : 'ADMIN'} language="en" tone="mint" /></View><View style={[styles.metrics, ur && styles.rtlRow]}><Metric label={text(language, 'providers')} value={mode === 'demo' ? '24' : String(applications.length)} /><Metric label={text(language, 'customers')} value={mode === 'demo' ? '186' : '—'} /><Metric label={text(language, 'revenue')} value={mode === 'demo' ? 'Rs 82k' : '—'} /></View></View>
    <View style={styles.section}><ScreenTitle title={text(language, 'providerApprovals')} subtitle={language === 'ur' ? 'نئے سروس پروفیشنلز کی جانچ' : 'Review new service professionals'} trailing={<Pill language="en" label={String(applications.length)} tone="orange" />} />
      {applications.length === 0 ? <Card style={styles.empty}><Ionicons name="checkmark-done-outline" size={25} color={colors.jade} /><AppText language={language} size={12} color={colors.muted}>{language === 'ur' ? 'تمام درخواستیں دیکھی جا چکی ہیں۔' : 'All applications have been reviewed.'}</AppText></Card> : applications.map((item) => <Card key={item.id} style={styles.application}><View style={[styles.appTop, ur && styles.rtlRow]}><IconCircle name="person-outline" background={colors.orangeSoft} color="#B76B2D" /><View style={{ flex: 1 }}><AppText language={language} size={13} weight="bold">{ur ? item.nameUr : item.nameEn}</AppText><AppText language={language} size={10} color={colors.muted}>{ur ? item.tradeUr : item.tradeEn} · {item.specialty}</AppText></View><Pill language={language} label={language === 'ur' ? 'زیرِ جائزہ' : 'Pending'} tone="orange" /></View><View style={[styles.appActions, ur && styles.rtlRow]}><Button language={language} title={text(language, 'approve')} icon="checkmark" onPress={() => approve(item)} style={{ flex: 1, minHeight: 39 }} /><Button language={language} title={text(language, 'suspend')} variant="outline" onPress={() => approve(item, 'suspended')} style={{ minHeight: 39 }} /></View></Card>)}
    </View>
    <View style={styles.section}><ScreenTitle title={text(language, 'manageServices')} subtitle={language === 'ur' ? 'کسٹمر ایپ میں دستیاب کیٹیگریز' : 'Categories visible in the customer app'} />{categories.map((item) => <View key={item.id} style={[styles.toggleRow, ur && styles.rtlRow]}><IconCircle name={item.icon as keyof typeof Ionicons.glyphMap} background={item.color} size={36} /><View style={{ flex: 1 }}><AppText language={language} size={12} weight="bold">{ur ? item.titleUr : item.titleEn}</AppText><AppText language="en" size={9} color={colors.muted}>{serviceToggles[item.id] ? 'LIVE' : 'PAUSED'}</AppText></View><Switch value={serviceToggles[item.id]} onValueChange={(value) => toggleCategory(item.id, value)} trackColor={{ false: '#D8DFD9', true: '#85B69F' }} thumbColor={serviceToggles[item.id] ? colors.jade : '#F5F5F5'} /></View>)}</View>
    <View style={styles.section}><ScreenTitle title={text(language, 'manageOffers')} subtitle={language === 'ur' ? 'پروموشنل کوڈز' : 'Promotional codes'} /><Card style={styles.offerRow}><View style={styles.offerIcon}><Ionicons name="pricetag" size={17} color="#A45E22" /></View><View style={{ flex: 1 }}><AppText language="en" size={13} weight="bold">PEHLI15 · 15% off</AppText><AppText language={language} size={10} color={colors.muted}>{text(language, 'promoTitle')}</AppText></View><Switch value={promoOn} onValueChange={togglePromo} trackColor={{ false: '#D8DFD9', true: '#85B69F' }} thumbColor={promoOn ? colors.jade : '#F5F5F5'} /></Card></View>
    <View style={styles.section}><ScreenTitle title={language === 'ur' ? 'تازہ ترین بکنگز' : 'Recent bookings'} />{bookings.slice(0, 3).map((booking) => <Card key={booking.id} style={styles.bookingRow}><View style={[styles.appTop, ur && styles.rtlRow]}><View style={{ flex: 1 }}><AppText language={language} size={12} weight="bold">{ur ? booking.serviceNameUr : booking.serviceNameEn} · {booking.customerName}</AppText><AppText language={language} size={10} color={colors.muted}>{booking.address}</AppText></View><Pill language={language} label={text(language, booking.status)} tone={booking.status === 'completed' ? 'mint' : 'blue'} /></View>{!['completed', 'cancelled'].includes(booking.status) ? <Button language={language} title={booking.status === 'pending' && booking.providerId ? text(language, 'acceptJob') : (ur ? 'بکنگ منسوخ کریں' : 'Cancel booking')} icon={booking.status === 'pending' && booking.providerId ? 'checkmark' : 'close'} variant="outline" onPress={() => changeBookingStatus(booking)} style={{ minHeight: 36, marginTop: 7 }} /> : null}</Card>)}</View>
    {notice ? <View style={styles.notice}><AppText language={language} size={11} color={notice.toLowerCase().includes('could') ? colors.red : colors.jade}>{notice}</AppText></View> : null}
    <AppText language={language} size={10} color={colors.muted}>{text(language, 'demoLabel')}</AppText>
  </View>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={{ flex: 1, gap: 3 }}><AppText language="en" size={17} weight="bold" color={colors.white}>{value}</AppText><AppText language="ur" size={9} color="#CDE0D4">{label}</AppText></View>; }

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.forest, borderRadius: radius.lg, padding: 17, gap: 17 }, heroHead: { flexDirection: 'row', alignItems: 'center', gap: 10 }, metrics: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.16)', paddingTop: 13 }, section: { gap: 10 }, application: { gap: 12, padding: 13 }, appTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, appActions: { flexDirection: 'row', gap: 8 }, empty: { alignItems: 'center', gap: 6, padding: 18 }, toggleRow: { minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingHorizontal: 11 }, offerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }, offerIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' }, bookingRow: { padding: 12 }, notice: { backgroundColor: colors.mint, borderRadius: 12, padding: 10 }, rtlRow: { flexDirection: 'row-reverse' },
});
