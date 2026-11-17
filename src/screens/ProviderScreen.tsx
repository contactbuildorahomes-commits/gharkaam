import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppUser, Booking, BookingStatus, Language, SessionMode } from '../types';
import { providers } from '../data/mock';
import { listProviderOpenJobs } from '../data/repository';
import { getDemoProviderBookings } from '../lib/demoState';
import { colors, spacing } from '../theme/tokens';
import { AppText, Button, Card, IconCircle, Pill, ScreenTitle, formatPKR } from '../components/ui';
import { text } from '../i18n/translations';

export function ProviderScreen({ language, user, mode, bookings, onStatusChange }: {
  language: Language;
  user: AppUser | null;
  mode: SessionMode;
  bookings: Booking[];
  onStatusChange: (booking: Booking, status: BookingStatus) => Promise<void>;
}) {
  const ur = language === 'ur';
  const [openJobs, setOpenJobs] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const demoProvider = providers[0];
  const approved = mode === 'demo' || user?.providerStatus === 'approved';
  const liveJobs = useMemo(() => bookings.filter((item) => !['completed', 'cancelled'].includes(item.status)), [bookings]);
  const visibleJobs = mode === 'demo'
    ? getDemoProviderBookings(bookings, demoProvider.id, ['electrician'])
    : [...liveJobs, ...openJobs.filter((job) => !liveJobs.some((live) => live.id === job.id))];
  const completedJobs = mode === 'demo'
    ? bookings.filter((item) => item.providerId === demoProvider.id && item.status === 'completed')
    : [];
  const demoEarnings = completedJobs.reduce((total, booking) => total + booking.price, 0);

  useEffect(() => {
    let mounted = true;
    if (mode !== 'authenticated' || !approved || !user) { setOpenJobs([]); return; }
    listProviderOpenJobs(user, mode).then((rows) => { if (mounted) setOpenJobs(rows); }).catch((e: any) => { if (mounted) setError(e?.message ?? 'Could not load open jobs.'); });
    return () => { mounted = false; };
  }, [mode, approved, user?.id]);

  const advance = async (booking: Booking, next: BookingStatus) => {
    setError('');
    try {
      await onStatusChange(booking, next);
      if (mode !== 'demo') setOpenJobs((rows) => rows.filter((row) => row.id !== booking.id));
    } catch (e: any) { setError(e?.message ?? 'Could not update this job.'); }
  };

  return <View style={{ gap: spacing.lg }}>
    <View style={styles.top}><ScreenTitle eyebrow={ur ? 'سروس پارٹنر' : 'SERVICE PARTNER'} title={text(language, 'providerTitle')} subtitle={ur ? 'واضح درخواستیں، معتبر کام' : 'Clear requests, reliable service'} /></View>
    {!approved ? <Card style={styles.pendingCard}>
      <IconCircle name="time-outline" background={colors.orangeSoft} color="#B76B2D" size={48} />
      <AppText language={language} size={17} weight="bold" style={{ marginTop: 9 }}>{text(language, 'approvalPending')}</AppText>
      <AppText language={language} size={12} color={colors.muted}>{ur ? 'آپ کا پروفائل لاہور کے آپریشنز ٹیم کو بھیج دیا گیا ہے۔ منظوری کے بعد نئی بکنگز دکھائی دیں گی۔' : 'Your Lahore profile is with the operations team. New jobs will appear after approval.'}</AppText>
      <View style={styles.pendingSteps}><Pill language={language} label={ur ? '۱ · شناخت' : '1 · ID check'} /><Pill language={language} label={ur ? '۲ · ہنر کی تصدیق' : '2 · Trade check'} tone="neutral" /><Pill language={language} label={ur ? '۳ · منظوری' : '3 · approval'} tone="neutral" /></View>
    </Card> : <>
      <View style={styles.stats}>
        <StatCard language={language} label={text(language, 'newRequests')} value={String(visibleJobs.filter((job) => job.status === 'pending').length)} icon="briefcase-outline" />
        <StatCard language={language} label={text(language, 'earnings')} value={mode === 'demo' ? formatPKR(demoEarnings) : '—'} icon="trending-up-outline" />
      </View>
      <View style={styles.tip}><Ionicons name="shield-checkmark" size={17} color={colors.jade} /><AppText language={language} size={11} color={colors.inkSoft} style={{ flex: 1 }}>{ur ? 'گاہک کی تفصیل قبول کرنے کے بعد ہی ظاہر ہوتی ہے۔' : 'Customer contact details appear after you accept a job.'}</AppText></View>
      <ScreenTitle title={text(language, 'newRequests')} subtitle={mode === 'demo' ? text(language, 'sharedDemoBookings') : (ur ? 'اہل کھلی درخواستیں' : 'Eligible open requests')} />
      {visibleJobs.length === 0 ? <Card style={styles.pendingCard}>
        <IconCircle name="checkmark-done-outline" />
        <AppText language={language} size={13} color={colors.muted}>{mode === 'demo' ? text(language, 'demoProviderEmpty') : (ur ? 'ابھی کوئی نئی درخواست نہیں' : 'No new requests right now')}</AppText>
      </Card> : visibleJobs.map((booking) => <Card key={booking.id} style={styles.job}>
        <View style={[styles.jobTop, ur && styles.rtlRow]}>
          <View style={{ flex: 1 }}>
            <View style={[styles.titleLine, ur && styles.rtlRow]}><AppText language={language} size={14} weight="bold">{ur ? booking.serviceNameUr : booking.serviceNameEn}</AppText><Pill language={language} label={text(language, booking.status)} tone={booking.status === 'completed' ? 'mint' : booking.status === 'pending' ? 'orange' : 'blue'} /></View>
            <AppText language={language} size={11} color={colors.muted}>{ur ? booking.subtypeUr : booking.subtypeEn} · {booking.status === 'pending' ? text(language, 'newCustomer') : booking.customerName}</AppText>
          </View>
          <AppText language="en" size={13} weight="bold" color={colors.forest}>{formatPKR(booking.price)}</AppText>
        </View>
        <View style={[styles.info, ur && styles.rtlRow]}><Ionicons name="location-outline" size={15} color={colors.jade} /><AppText language={language} size={11} style={{ flex: 1 }}>{booking.status === 'pending' ? text(language, 'providerAddressAfterAcceptance') : booking.address}</AppText></View>
        {booking.description ? <AppText language={language} size={11} color={colors.inkSoft}>{booking.description}</AppText> : null}
        <View style={[styles.info, ur && styles.rtlRow]}><Ionicons name="time-outline" size={15} color={colors.muted} /><AppText language="en" size={10} color={colors.muted}>{new Date(booking.scheduledAt).toLocaleString('en-PK', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</AppText></View>
        {booking.status === 'pending' ? <Button language={language} title={text(language, 'acceptJob')} icon="checkmark" onPress={() => void advance(booking, 'accepted')} style={{ marginTop: 4, minHeight: 42 }} />
          : booking.status === 'accepted' ? <Button language={language} title={text(language, 'startJob')} icon="navigate-outline" onPress={() => void advance(booking, 'on_the_way')} style={{ marginTop: 4, minHeight: 42 }} />
            : booking.status === 'on_the_way' ? <Button language={language} title={text(language, 'startJob')} icon="construct-outline" onPress={() => void advance(booking, 'in_progress')} style={{ marginTop: 4, minHeight: 42 }} />
              : booking.status === 'in_progress' ? <Button language={language} title={text(language, 'finishJob')} icon="checkmark-done" onPress={() => void advance(booking, 'completed')} style={{ marginTop: 4, minHeight: 42 }} /> : null}
      </Card>)}
      {error ? <View style={styles.error}><AppText language={language} size={11} color={colors.red}>{error}</AppText></View> : null}
      <Card style={styles.profile}>
        <View style={[styles.jobTop, ur && styles.rtlRow]}><IconCircle name="person-circle-outline" /><View style={{ flex: 1 }}><AppText language={language} size={13} weight="bold">{user?.displayName ?? (ur ? demoProvider.nameUr : demoProvider.nameEn)}</AppText><AppText language={language} size={10} color={colors.muted}>{ur ? 'الیکٹریشن · لاہور' : 'Electrician · Lahore'}</AppText></View><Pill language={language} label={mode === 'demo' ? text(language, 'sampleProfile') : text(language, 'verified')} tone={mode === 'demo' ? 'neutral' : 'mint'} /></View>
      </Card>
      {mode === 'demo' ? <AppText language={language} size={10} color={colors.muted}>{text(language, 'demoLabel')}</AppText> : null}
    </>}
  </View>;
}

function StatCard({ language, label, value, icon }: { language: Language; label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return <Card style={styles.stat}><Ionicons name={icon} size={17} color={colors.jade} /><AppText language="en" size={18} weight="bold" color={colors.forest}>{value}</AppText><AppText language={language} size={10} color={colors.muted}>{label}</AppText></Card>;
}

const styles = StyleSheet.create({
  top: { marginBottom: -12 },
  pendingCard: { alignItems: 'center', gap: 10, padding: 22 },
  pendingSteps: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 7, padding: 13, alignItems: 'flex-start' },
  tip: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.mint, padding: 11, borderRadius: 13 },
  job: { gap: 10, padding: 14 },
  jobTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  error: { backgroundColor: colors.redSoft, borderRadius: 12, padding: 10 },
  profile: { padding: 12 },
  rtlRow: { flexDirection: 'row-reverse' },
});
