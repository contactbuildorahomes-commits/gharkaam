import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Booking, BookingStatus, Language, SessionMode, ServiceCategory } from '../types';
import { categories, demoBookings, providerApplications, providers as sampleProviders } from '../data/mock';
import { loadAdminSnapshot, loadDemoAdminOverrides, setCategoryActive, setPromoActive, setProviderApproval, type AdminPromotion, type AdminProviderRecord, type AdminSnapshot, type DemoAdminOverrides } from '../data/repository';
import { colors, radius, spacing } from '../theme/tokens';
import { AppText, Button, Card, IconCircle, Pill, formatPKR } from '../components/ui';
import { text } from '../i18n/translations';

type AdminTab = 'overview' | 'applications' | 'providers' | 'bookings' | 'services';
type ProviderFilter = 'all' | 'pending' | 'approved' | 'suspended';
type BookingFilter = 'all' | 'active' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
type ConfirmAction =
  | { kind: 'provider'; provider: AdminProviderRecord; status: 'approved' | 'suspended' }
  | { kind: 'booking'; booking: Booking; status: BookingStatus };

const DEMO_SNAPSHOT: AdminSnapshot = {
  customers: 186,
  totalProviders: providerApplications.length + sampleProviders.length,
  pendingProviders: providerApplications.length,
  approvedProviders: sampleProviders.length,
  suspendedProviders: 0,
  totalBookings: demoBookings.length,
  activeBookings: demoBookings.filter((booking) => !['completed', 'cancelled'].includes(booking.status)).length,
  providers: [
    ...providerApplications.map((item) => ({
      id: item.id, name: item.nameEn, phone: '', serviceArea: 'Lahore',
      categoryIds: item.tradeEn.toLowerCase().includes('plumb') ? ['plumber'] : ['electrician'],
      yearsExperience: 0, status: 'pending' as const, rating: 0, reviews: 0, completedJobs: 0, createdAt: new Date().toISOString(),
    })),
    ...sampleProviders.map((item, index) => ({
      id: item.id, name: item.nameEn, phone: '', serviceArea: 'Lahore',
      categoryIds: item.tradeEn.toLowerCase().includes('plumb') ? ['plumber'] : ['electrician'],
      yearsExperience: 4 + index, status: 'approved' as const, rating: item.rating, reviews: item.reviews,
      completedJobs: item.completedJobs, createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    })),
  ],
  serviceCategories: categories,
  promotions: [{ code: 'PEHLI15', titleEn: 'First booking discount', titleUr: 'پہلی بکنگ پر رعایت', discountPercent: 15, active: true, expiresAt: null, usageLimit: null }],
};

const providerFilters: ProviderFilter[] = ['all', 'pending', 'approved', 'suspended'];
const bookingFilters: BookingFilter[] = ['all', 'active', 'pending', 'in_progress', 'completed', 'cancelled'];

function buildDemoSnapshot(overrides: DemoAdminOverrides): AdminSnapshot {
  const demoProviders = DEMO_SNAPSHOT.providers.map((provider) => ({ ...provider, status: overrides.providerStatuses[provider.id] ?? provider.status }));
  return {
    ...DEMO_SNAPSHOT,
    pendingProviders: demoProviders.filter((provider) => provider.status === 'pending').length,
    approvedProviders: demoProviders.filter((provider) => provider.status === 'approved').length,
    suspendedProviders: demoProviders.filter((provider) => provider.status === 'suspended').length,
    providers: demoProviders,
    serviceCategories: DEMO_SNAPSHOT.serviceCategories.map((category) => ({ ...category, available: overrides.serviceCategoryActive[category.id] ?? category.available })),
    promotions: DEMO_SNAPSHOT.promotions.map((promotion) => ({ ...promotion, active: overrides.promotionActive[promotion.code] ?? promotion.active })),
  };
}

export function AdminScreen({ language, user, mode, bookings, onBookingStatus }: {
  language: Language;
  user: { email: string; displayName: string } | null;
  mode: SessionMode;
  bookings: Booking[];
  onBookingStatus: (booking: Booking, status: BookingStatus) => Promise<void>;
}) {
  const ur = language === 'ur';
  const [tab, setTab] = useState<AdminTab>('overview');
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('pending');
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('active');
  const [query, setQuery] = useState('');
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setNotice(null);
    try {
      const next = mode === 'demo' ? buildDemoSnapshot(await loadDemoAdminOverrides()) : await loadAdminSnapshot();
      setSnapshot(next);
      setLastUpdated(new Date());
    } catch (error: any) {
      setNotice({ message: error?.message ?? (ur ? 'انتظامی ڈیٹا لوڈ نہیں ہو سکا۔' : 'Could not load admin data.'), error: true });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const request = mode === 'demo' ? loadDemoAdminOverrides().then(buildDemoSnapshot) : loadAdminSnapshot();
    request.then((next) => {
      if (!mounted) return;
      setSnapshot(next);
      setLastUpdated(new Date());
    }).catch((error: any) => {
      if (mounted) setNotice({ message: error?.message ?? (ur ? 'انتظامی ڈیٹا لوڈ نہیں ہو سکا۔' : 'Could not load admin data.'), error: true });
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [mode, ur]);

  const currentSnapshot = useMemo(() => {
    if (!snapshot || mode !== 'demo') return snapshot;
    return {
      ...snapshot,
      totalBookings: bookings.length,
      activeBookings: bookings.filter((booking) => !['completed', 'cancelled'].includes(booking.status)).length,
    };
  }, [snapshot, mode, bookings]);

  const visibleProviders = useMemo(() => {
    if (!currentSnapshot) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return currentSnapshot.providers.filter((provider) => {
      if (providerFilter !== 'all' && provider.status !== providerFilter) return false;
      if (!normalizedQuery) return true;
      const categoryNames = provider.categoryIds.map((id) => categoryTitle(currentSnapshot.serviceCategories, id, language)).join(' ');
      return `${provider.name} ${provider.phone} ${provider.serviceArea} ${categoryNames}`.toLowerCase().includes(normalizedQuery);
    });
  }, [currentSnapshot, providerFilter, query, language]);

  const visibleBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (bookingFilter === 'active' && ['completed', 'cancelled'].includes(booking.status)) return false;
      if (bookingFilter !== 'all' && bookingFilter !== 'active' && booking.status !== bookingFilter) return false;
      if (!normalizedQuery) return true;
      const title = language === 'ur' ? booking.serviceNameUr : booking.serviceNameEn;
      return `${booking.id} ${title} ${booking.customerName} ${booking.providerName} ${booking.preferredProviderName ?? ''} ${booking.address} ${booking.description}`.toLowerCase().includes(normalizedQuery);
    });
  }, [bookings, bookingFilter, query, language]);

  const showTab = (next: AdminTab) => {
    setTab(next);
    setQuery('');
    if (next === 'applications') setProviderFilter('pending');
    if (next === 'providers') setProviderFilter('all');
    if (next === 'bookings') setBookingFilter('active');
    setNotice(null);
  };

  const executeConfirmation = async () => {
    if (!confirmation) return;
    setActionBusy(true);
    setNotice(null);
    try {
      if (confirmation.kind === 'provider') {
        const { provider, status } = confirmation;
        await setProviderApproval(provider.id, status, mode);
        setSnapshot((current) => current ? {
          ...current,
          pendingProviders: current.pendingProviders - (provider.status === 'pending' ? 1 : 0),
          approvedProviders: current.approvedProviders + (status === 'approved' ? 1 : 0) - (provider.status === 'approved' ? 1 : 0),
          suspendedProviders: current.suspendedProviders + (status === 'suspended' ? 1 : 0) - (provider.status === 'suspended' ? 1 : 0),
          providers: current.providers.map((row) => row.id === provider.id ? { ...row, status } : row),
        } : current);
        setNotice({ message: status === 'approved' ? (ur ? 'پروفیشنل منظور ہو گیا۔' : 'Provider approved.') : (ur ? 'پروفیشنل معطل کر دیا گیا۔' : 'Provider suspended.') });
      } else {
        const wasActive = !['completed', 'cancelled'].includes(confirmation.booking.status);
        const becomesInactive = ['completed', 'cancelled'].includes(confirmation.status);
        await onBookingStatus(confirmation.booking, confirmation.status);
        if (wasActive && becomesInactive) setSnapshot((current) => current ? { ...current, activeBookings: Math.max(0, current.activeBookings - 1) } : current);
        setNotice({ message: ur ? 'بکنگ کی حیثیت اپ ڈیٹ ہو گئی۔' : 'Booking status updated.' });
      }
      setConfirmation(null);
    } catch (error: any) {
      setNotice({ message: error?.message ?? (ur ? 'تبدیلی محفوظ نہیں ہو سکی۔' : 'The change could not be saved.'), error: true });
    } finally {
      setActionBusy(false);
    }
  };

  const toggleCategory = async (category: ServiceCategory, active: boolean) => {
    try {
      await setCategoryActive(category.id, active, mode);
      setSnapshot((current) => current ? { ...current, serviceCategories: current.serviceCategories.map((item) => item.id === category.id ? { ...item, available: active } : item) } : current);
      setNotice({ message: active ? (ur ? 'سروس دوبارہ فعال ہو گئی۔' : 'Service is live again.') : (ur ? 'سروس روک دی گئی۔' : 'Service paused.') });
    } catch (error: any) {
      setNotice({ message: error?.message ?? (ur ? 'سروس اپ ڈیٹ نہیں ہو سکی۔' : 'Could not update service.'), error: true });
    }
  };

  const togglePromotion = async (promotion: AdminPromotion, active: boolean) => {
    try {
      await setPromoActive(promotion.code, active, mode);
      setSnapshot((current) => current ? { ...current, promotions: current.promotions.map((item) => item.code === promotion.code ? { ...item, active } : item) } : current);
      setNotice({ message: active ? (ur ? 'آفر فعال ہو گئی۔' : 'Offer is live again.') : (ur ? 'آفر روک دی گئی۔' : 'Offer paused.') });
    } catch (error: any) {
      setNotice({ message: error?.message ?? (ur ? 'آفر اپ ڈیٹ نہیں ہو سکی۔' : 'Could not update offer.'), error: true });
    }
  };

  const tabs: { id: AdminTab; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[] = [
    { id: 'overview', label: ur ? 'جائزہ' : 'Overview', icon: 'grid-outline' },
    { id: 'applications', label: ur ? 'درخواستیں' : 'Applications', icon: 'person-add-outline', badge: currentSnapshot?.pendingProviders },
    { id: 'providers', label: ur ? 'ماہرین' : 'Providers', icon: 'people-outline' },
    { id: 'bookings', label: ur ? 'بکنگز' : 'Bookings', icon: 'calendar-outline' },
    { id: 'services', label: ur ? 'سروسز اور آفرز' : 'Services & offers', icon: 'options-outline' },
  ];

  const currentLabel = lastUpdated ? new Intl.DateTimeFormat(ur ? 'ur-PK' : 'en-PK', { hour: 'numeric', minute: '2-digit' }).format(lastUpdated) : '—';
  const content = !currentSnapshot ? null : tab === 'overview' ? (
    <OverviewPanel language={language} snapshot={currentSnapshot} bookings={bookings} mode={mode} userName={user?.displayName ?? ''} onNavigate={showTab} onBookingAction={(booking, status) => setConfirmation({ kind: 'booking', booking, status })} onProviderAction={(provider, status) => setConfirmation({ kind: 'provider', provider, status })} />
  ) : tab === 'applications' || tab === 'providers' ? (
    <ProvidersPanel language={language} providers={visibleProviders} serviceCategories={currentSnapshot.serviceCategories} totalProviders={currentSnapshot.totalProviders} pendingProviders={currentSnapshot.pendingProviders} approvedProviders={currentSnapshot.approvedProviders} suspendedProviders={currentSnapshot.suspendedProviders} filter={providerFilter} query={query} onQuery={setQuery} onFilter={setProviderFilter} onAction={(provider, status) => setConfirmation({ kind: 'provider', provider, status })} />
  ) : tab === 'bookings' ? (
    <BookingsPanel language={language} bookings={visibleBookings} total={bookings.length} filter={bookingFilter} query={query} onQuery={setQuery} onFilter={setBookingFilter} onAction={(booking, status) => setConfirmation({ kind: 'booking', booking, status })} />
  ) : (
    <ServicesPanel language={language} categories={currentSnapshot.serviceCategories} promotions={currentSnapshot.promotions} onCategoryChange={toggleCategory} onPromotionChange={togglePromotion} />
  );

  return <View style={{ gap: spacing.lg }}>
    <View style={styles.hero}>
      <View style={[styles.heroTop, ur && styles.rtlRow]}>
        <IconCircle name="shield-checkmark" background="rgba(255,255,255,0.12)" color={colors.lime} size={48} />
        <View style={{ flex: 1 }}>
          <AppText language={language} size={20} weight="bold" color={colors.white}>{text(language, 'adminTitle')}</AppText>
          <AppText language="en" size={10} color="#D4E5DB" numberOfLines={1}>{user?.email ?? (ur ? 'ڈیمو ایڈمن • لاہور' : 'Demo admin · Lahore')}</AppText>
        </View>
        <Pill label={mode === 'demo' ? 'DEMO' : 'SECURE'} language="en" tone={mode === 'demo' ? 'orange' : 'mint'} />
      </View>
      <View style={[styles.heroFooter, ur && styles.rtlRow]}>
        <View style={[styles.liveDot, { backgroundColor: mode === 'demo' ? colors.orange : colors.lime }]} />
        <AppText language={language} size={10} color="#D4E5DB" style={{ flex: 1 }}>{mode === 'demo' ? (ur ? 'نمونہ ڈیٹا — تبدیلیاں صرف اسی ڈیوائس کے ڈیمو میں محفوظ ہیں' : 'Sample data · Changes are saved only in this device’s demo') : (ur ? 'محفوظ ایڈمن سیشن · اختیارات سرور سے محفوظ' : 'Protected admin session · actions enforced by the server')}</AppText>
        <Pressable onPress={() => void refresh()} accessibilityRole="button" accessibilityLabel={ur ? 'ڈیٹا تازہ کریں' : 'Refresh data'} disabled={refreshing} style={styles.refreshButton}>
          {refreshing ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="refresh" size={17} color={colors.white} />}
        </Pressable>
      </View>
    </View>

    {currentSnapshot ? <View style={[styles.metricsGrid, ur && styles.rtlRow]}>
      <MetricCard language={language} icon="people-outline" label={text(language, 'customers')} value={currentSnapshot.customers.toLocaleString(ur ? 'ur-PK' : 'en-PK')} tint={colors.blueSoft} />
      <MetricCard language={language} icon="construct-outline" label={text(language, 'providers')} value={currentSnapshot.totalProviders.toLocaleString(ur ? 'ur-PK' : 'en-PK')} tint={colors.mint} onPress={() => { showTab('providers'); setProviderFilter('all'); }} />
      <MetricCard language={language} icon="calendar-outline" label={ur ? 'کل بکنگز' : 'Total bookings'} value={currentSnapshot.totalBookings.toLocaleString(ur ? 'ur-PK' : 'en-PK')} tint={colors.orangeSoft} onPress={() => { showTab('bookings'); setBookingFilter('all'); }} />
      <MetricCard language={language} icon="pulse-outline" label={ur ? 'فعال کام' : 'Active jobs'} value={currentSnapshot.activeBookings.toLocaleString(ur ? 'ur-PK' : 'en-PK')} tint="#EAF5F8" onPress={() => { showTab('bookings'); setBookingFilter('active'); }} />
    </View> : null}

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabStrip, ur && styles.rtlRow]}>
      {tabs.map((item) => {
        const active = tab === item.id;
        return <Pressable key={item.id} onPress={() => showTab(item.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.tabButton, active && styles.tabButtonActive, ur && styles.rtlRow]}>
          <Ionicons name={item.icon} size={15} color={active ? colors.white : colors.inkSoft} />
          <AppText language={language} size={11} weight="bold" color={active ? colors.white : colors.inkSoft}>{item.label}</AppText>
          {item.badge ? <View style={[styles.tabBadge, active && styles.tabBadgeActive]}><AppText language="en" size={9} weight="bold" color={active ? colors.forest : '#A95C20'}>{item.badge}</AppText></View> : null}
        </Pressable>;
      })}
    </ScrollView>

    <View style={styles.contentHeader}>
      <View style={{ flex: 1 }}><AppText language={language} size={17} weight="bold">{tabs.find((item) => item.id === tab)?.label}</AppText><AppText language={language} size={10} color={colors.muted}>{ur ? `آخری تازہ کاری ${currentLabel}` : `Last synced ${currentLabel}`}</AppText></View>
      {tab === 'providers' || tab === 'applications' || tab === 'bookings' ? <View style={[styles.searchBox, ur && styles.rtlRow]}><Ionicons name="search" size={15} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder={ur ? 'تلاش کریں' : tab === 'bookings' ? 'Search ID, name, area…' : 'Search name, phone, area…'} placeholderTextColor={colors.muted} autoCapitalize="none" style={[styles.searchInput, { textAlign: ur ? 'right' : 'left', writingDirection: ur ? 'rtl' : 'ltr' }]} /></View> : null}
    </View>

    {notice ? <View style={[styles.notice, notice.error && styles.noticeError]}><Ionicons name={notice.error ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={17} color={notice.error ? colors.red : colors.jade} /><AppText language={language} size={11} color={notice.error ? colors.red : colors.jade} style={{ flex: 1 }}>{notice.message}</AppText><Pressable onPress={() => setNotice(null)} accessibilityLabel={ur ? 'بند کریں' : 'Dismiss'}><Ionicons name="close" size={16} color={notice.error ? colors.red : colors.jade} /></Pressable></View> : null}

    {loading ? <Card style={styles.loading}><ActivityIndicator color={colors.jade} /><AppText language={language} size={12} color={colors.muted}>{ur ? 'آپریشنز ڈیٹا لوڈ ہو رہا ہے…' : 'Loading operations data…'}</AppText></Card> : content}

    <View style={[styles.footerNote, ur && styles.rtlRow]}><Ionicons name="information-circle-outline" size={16} color={colors.muted} /><AppText language={language} size={10} color={colors.muted} style={{ flex: 1 }}>{ur ? 'ادائیگی پروسیسنگ اور فراہم کنندگان کی لائیو GPS ٹریکنگ فعال نہیں ہیں۔' : 'Payment processing and live provider GPS tracking are not enabled.'}</AppText></View>

    <ConfirmationModal language={language} action={confirmation} busy={actionBusy} onCancel={() => setConfirmation(null)} onConfirm={() => void executeConfirmation()} />
  </View>;
}

function OverviewPanel({ language, snapshot, bookings, mode, userName, onNavigate, onBookingAction, onProviderAction }: {
  language: Language; snapshot: AdminSnapshot; bookings: Booking[]; mode: SessionMode; userName: string;
  onNavigate: (tab: AdminTab) => void; onBookingAction: (booking: Booking, status: BookingStatus) => void;
  onProviderAction: (provider: AdminProviderRecord, status: 'approved' | 'suspended') => void;
}) {
  const ur = language === 'ur';
  const latestBookings = [...bookings].slice(0, 3);
  const pending = snapshot.providers.filter((provider) => provider.status === 'pending').slice(0, 2);
  return <View style={{ gap: spacing.lg }}>
    <Card style={styles.welcomeCard}>
      <View style={[styles.welcomeHead, ur && styles.rtlRow]}>
        <View style={{ flex: 1 }}><AppText language={language} size={12} weight="bold" color={colors.jade}>{ur ? 'خوش آمدید' : 'YOUR MARKETPLACE AT A GLANCE'}</AppText><AppText language={language} size={17} weight="bold" style={{ marginTop: 3 }}>{ur ? 'خوش آمدید' : `Welcome${userName ? `, ${userName.split(' ')[0]}` : ' back'}`}</AppText></View>
        <IconCircle name="analytics-outline" background={colors.mint} color={colors.jade} size={42} />
      </View>
      <View style={[styles.healthStrip, ur && styles.rtlRow]}><View style={styles.healthIcon}><Ionicons name="shield-checkmark" size={15} color={colors.jade} /></View><AppText language={language} size={11} weight="medium" style={{ flex: 1 }}>{ur ? 'ایڈمن کنٹرولز محفوظ ہیں' : 'Admin controls are protected by Supabase role checks'}</AppText></View>
    </Card>

    <View style={[styles.attentionGrid, ur && styles.rtlRow]}>
      <AttentionCard language={language} icon="person-add-outline" label={ur ? 'منظوری درکار' : 'Needs review'} value={String(snapshot.pendingProviders)} detail={ur ? 'زیرِ جائزہ درخواستیں' : 'provider applications'} tint={colors.orangeSoft} onPress={() => onNavigate('applications')} />
      <AttentionCard language={language} icon="flash-outline" label={ur ? 'فعال بکنگز' : 'Live operations'} value={String(snapshot.activeBookings)} detail={ur ? 'کھلے یا جاری کام' : 'open or in-progress jobs'} tint={colors.blueSoft} onPress={() => onNavigate('bookings')} />
    </View>

    {pending.length > 0 ? <View style={styles.section}>
      <SectionHeading language={language} title={ur ? 'ماہرین کی درخواستیں' : 'Provider applications'} action={ur ? 'سب دیکھیں' : 'View all'} onPress={() => onNavigate('applications')} />
      {pending.map((provider) => <ProviderCard key={provider.id} language={language} provider={provider} serviceCategories={snapshot.serviceCategories} onAction={(status) => onProviderAction(provider, status)} compact />)}
    </View> : null}

    <View style={styles.section}>
      <SectionHeading language={language} title={ur ? 'تازہ بکنگز' : 'Recent bookings'} action={ur ? 'سب دیکھیں' : 'View all'} onPress={() => onNavigate('bookings')} />
      {latestBookings.length ? latestBookings.map((booking) => <BookingCard key={booking.id} language={language} booking={booking} onAction={onBookingAction} compact />) : <EmptyCard language={language} icon="calendar-clear-outline" title={ur ? 'ابھی کوئی بکنگ نہیں' : 'No bookings yet'} caption={ur ? 'نئی بکنگز یہاں نظر آئیں گی۔' : 'New bookings will appear here.'} />}
    </View>

    <Card style={styles.noPayments}>
      <IconCircle name="wallet-outline" background="#F0F2EF" color={colors.muted} size={37} />
      <View style={{ flex: 1 }}><AppText language={language} size={11} weight="bold">{ur ? 'ادائیگی اسٹیٹس' : 'Payments are not connected'}</AppText><AppText language={language} size={10} color={colors.muted}>{mode === 'demo' ? (ur ? 'ڈیمو رقم حقیقی آمدنی نہیں ہے۔' : 'Demo booking values are not collected revenue.') : (ur ? 'ابھی کوئی اصل ادائیگی نہیں لی جاتی۔' : 'No money is collected or processed in this release.')}</AppText></View>
      <Pill language={language} label={ur ? 'بند' : 'OFF'} tone="neutral" />
    </Card>
  </View>;
}

function ProvidersPanel({ language, providers: rows, serviceCategories, totalProviders, pendingProviders, approvedProviders, suspendedProviders, filter, query, onQuery, onFilter, onAction }: {
  language: Language; providers: AdminProviderRecord[]; serviceCategories: ServiceCategory[]; totalProviders: number; pendingProviders: number; approvedProviders: number; suspendedProviders: number;
  filter: ProviderFilter; query: string; onQuery: (value: string) => void; onFilter: (filter: ProviderFilter) => void;
  onAction: (provider: AdminProviderRecord, status: 'approved' | 'suspended') => void;
}) {
  const ur = language === 'ur';
  const counts: Record<ProviderFilter, number> = {
    all: totalProviders,
    pending: pendingProviders,
    approved: approvedProviders,
    suspended: suspendedProviders,
  };
  return <View style={styles.section}>
    <View style={[styles.filterStrip, ur && styles.rtlRow]}>{providerFilters.map((item) => <FilterChip key={item} language={language} selected={filter === item} label={providerFilterLabel(language, item)} count={counts[item]} onPress={() => onFilter(item)} />)}</View>
    <AppText language={language} size={10} color={colors.muted}>{ur ? `تلاش میں ${rows.length} ماہرین دکھائے جا رہے ہیں` : `Showing ${rows.length} providers in the latest ${Math.min(totalProviders, 1000)} records`}</AppText>
    {rows.length ? rows.map((provider) => <ProviderCard key={provider.id} language={language} provider={provider} serviceCategories={serviceCategories} onAction={(status) => onAction(provider, status)} />) : <EmptyCard language={language} icon={query ? 'search-outline' : 'people-outline'} title={query ? (ur ? 'کوئی نتیجہ نہیں ملا' : 'No matching providers') : filter === 'pending' ? (ur ? 'تمام درخواستیں دیکھی جا چکی ہیں' : 'All applications are reviewed') : (ur ? 'اس فہرست میں کوئی ماہر نہیں' : 'No providers in this list')} caption={query ? (ur ? 'تلاش کے الفاظ بدل کر دیکھیں۔' : 'Try a different search term.') : (ur ? 'ڈیٹا دستیاب ہونے پر یہاں نظر آئے گا۔' : 'Provider records will appear here when available.')} />}
    {totalProviders > 1000 ? <AppText language={language} size={10} color={colors.muted}>{ur ? 'مزید ریکارڈ دکھانے کے لیے سرور پر صفحہ بندی درکار ہے۔' : 'More than 1,000 providers exist; this screen currently shows the latest 1,000.'}</AppText> : null}
  </View>;
}

function BookingsPanel({ language, bookings: rows, total, filter, query, onQuery, onFilter, onAction }: {
  language: Language; bookings: Booking[]; total: number; filter: BookingFilter; query: string; onQuery: (value: string) => void;
  onFilter: (filter: BookingFilter) => void; onAction: (booking: Booking, status: BookingStatus) => void;
}) {
  const ur = language === 'ur';
  return <View style={styles.section}>
    <Card style={styles.bookingTip}><Ionicons name="hand-left-outline" size={17} color={colors.blue} /><AppText language={language} size={10} color={colors.inkSoft} style={{ flex: 1 }}>{ur ? 'اسٹیٹس صرف درست اگلے مرحلے میں آگے بڑھائیں۔ ماہر کی تفویض خودکار نہیں ہے۔' : 'Move a booking only to its valid next step. Provider assignment is not available in the admin console.'}</AppText></Card>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterStrip, ur && styles.rtlRow]}>{bookingFilters.map((item) => <FilterChip key={item} language={language} selected={filter === item} label={bookingFilterLabel(language, item)} count={item === 'all' ? total : undefined} onPress={() => onFilter(item)} />)}</ScrollView>
    <AppText language={language} size={10} color={colors.muted}>{ur ? `${rows.length} از ${total} بکنگز` : `Showing ${rows.length} of ${total} loaded bookings${total >= 1000 ? ' · latest 1,000' : ''}`}</AppText>
    {rows.length ? rows.map((booking) => <BookingCard key={booking.id} language={language} booking={booking} onAction={onAction} />) : <EmptyCard language={language} icon={query ? 'search-outline' : 'calendar-clear-outline'} title={query ? (ur ? 'کوئی بکنگ نہیں ملی' : 'No matching bookings') : (ur ? 'اس فلٹر میں بکنگ نہیں' : 'Nothing in this queue')} caption={query ? (ur ? 'تلاش یا فلٹر تبدیل کریں۔' : 'Try another search or filter.') : (ur ? 'دوسری بکنگز دیکھنے کے لیے فلٹر تبدیل کریں۔' : 'Choose another filter to see other bookings.')} />}
  </View>;
}

function ServicesPanel({ language, categories: serviceRows, promotions, onCategoryChange, onPromotionChange }: {
  language: Language; categories: ServiceCategory[]; promotions: AdminPromotion[];
  onCategoryChange: (category: ServiceCategory, active: boolean) => void; onPromotionChange: (promotion: AdminPromotion, active: boolean) => void;
}) {
  const ur = language === 'ur';
  return <View style={styles.section}>
    <AppText language={language} size={12} color={colors.muted}>{ur ? 'کسٹمر ایپ کے لائیو کیٹلاگ اور آفرز کنٹرول کریں۔' : 'Control which services and promotions customers can use.'}</AppText>
    <View style={{ gap: 9 }}>
      {serviceRows.map((category) => <Card key={category.id} style={styles.serviceCard}>
        <View style={[styles.serviceTop, ur && styles.rtlRow]}><IconCircle name={iconName(category.icon)} background={category.color} size={40} /><View style={{ flex: 1 }}><AppText language={language} size={13} weight="bold">{language === 'ur' ? category.titleUr : category.titleEn}</AppText><AppText language={language} size={10} color={colors.muted}>{ur ? `${category.subtypes.length} ذیلی سروسز` : `${category.subtypes.length} service types · ${category.available ? 'Visible to customers' : 'Hidden from customers'}`}</AppText></View><Switch accessibilityLabel={ur ? `${category.titleUr} کیٹیگری فعال` : `Activate ${category.titleEn}`} value={category.available} onValueChange={(value) => onCategoryChange(category, value)} trackColor={{ false: '#D8DFD9', true: '#85B69F' }} thumbColor={category.available ? colors.jade : '#F5F5F5'} /></View>
        {category.subtypes.length ? <View style={styles.subtypeList}>{category.subtypes.slice(0, 4).map((subtype) => <View key={subtype.id} style={[styles.subtypeRow, ur && styles.rtlRow]}><View style={styles.subtypeDot} /><AppText language={language} size={10} color={colors.inkSoft} style={{ flex: 1 }}>{language === 'ur' ? subtype.titleUr : subtype.titleEn}</AppText><AppText language="en" size={10} weight="bold" color={colors.inkSoft}>{formatPKR(subtype.startingPrice)}</AppText></View>)}</View> : null}
      </Card>)}
    </View>

    <View style={[styles.promoHeading, ur && styles.rtlRow]}><IconCircle name="pricetag-outline" background={colors.orangeSoft} color="#A95C20" size={37} /><View style={{ flex: 1 }}><AppText language={language} size={15} weight="bold">{text(language, 'manageOffers')}</AppText><AppText language={language} size={10} color={colors.muted}>{ur ? 'صرف موجودہ آفرز کی حالت تبدیل کریں' : 'Manage existing promotion availability'}</AppText></View></View>
    {promotions.length ? promotions.map((promo) => <Card key={promo.code} style={styles.promoCard}>
      <View style={[styles.serviceTop, ur && styles.rtlRow]}><View style={styles.promoIcon}><Ionicons name="ticket-outline" size={17} color="#A45E22" /></View><View style={{ flex: 1 }}><View style={[styles.promoTitleRow, ur && styles.rtlRow]}><AppText language="en" size={13} weight="bold">{promo.code}</AppText><Pill language="en" label={`${promo.discountPercent}% OFF`} tone="orange" /></View><AppText language={language} size={10} color={colors.muted}>{language === 'ur' ? promo.titleUr : promo.titleEn}</AppText><AppText language={language} size={9} color={colors.muted}>{promo.expiresAt ? `${ur ? 'میعاد' : 'Expires'}: ${formatDate(promo.expiresAt, language)}` : (ur ? 'میعاد کی تاریخ نہیں' : 'No expiry date')} · {promo.usageLimit ? `${ur ? 'حد' : 'Limit'} ${promo.usageLimit}` : (ur ? 'استعمال کی حد نہیں' : 'No usage limit')}</AppText></View><Switch accessibilityLabel={ur ? `${promo.code} آفر فعال` : `Activate ${promo.code} offer`} value={promo.active} onValueChange={(value) => onPromotionChange(promo, value)} trackColor={{ false: '#D8DFD9', true: '#85B69F' }} thumbColor={promo.active ? colors.jade : '#F5F5F5'} /></View>
    </Card>) : <EmptyCard language={language} icon="pricetag-outline" title={ur ? 'کوئی آفر موجود نہیں' : 'No promotions configured'} caption={ur ? 'آفر بنانا اس اسکرین میں دستیاب نہیں۔' : 'Creating new promotions is not available in this release.'} />}
  </View>;
}

function ProviderCard({ language, provider, serviceCategories = categories, onAction, compact = false }: { language: Language; provider: AdminProviderRecord; serviceCategories?: ServiceCategory[]; onAction: (status: 'approved' | 'suspended') => void; compact?: boolean }) {
  const ur = language === 'ur';
  const status = provider.status;
  const categoriesLabel = provider.categoryIds.map((id) => categoryTitle(serviceCategories, id, language)).join(ur ? '، ' : ', ') || (ur ? 'سروس منتخب نہیں' : 'No service selected');
  const initial = provider.name.trim().charAt(0).toUpperCase() || 'G';
  return <Card style={[styles.providerCard, compact && styles.providerCompact]}>
    <View style={[styles.providerTop, ur && styles.rtlRow]}>
      <View style={styles.avatar}><AppText language="en" size={17} weight="bold" color={colors.forest}>{initial}</AppText></View>
      <View style={{ flex: 1 }}><AppText language={language} size={13} weight="bold" numberOfLines={1}>{provider.name}</AppText><AppText language={language} size={10} color={colors.muted}>{categoriesLabel}</AppText></View>
      <Pill language={language} label={providerStatusLabel(language, status)} tone={status === 'approved' ? 'mint' : status === 'suspended' ? 'red' : 'orange'} />
    </View>
    <View style={[styles.providerInfo, ur && styles.rtlRow]}>
      <InfoBit language={language} icon="location-outline" value={provider.serviceArea || '—'} />
      {provider.phone ? <InfoBit language={language} icon="call-outline" value={provider.phone} /> : null}
      {status === 'approved' ? <InfoBit language={language} icon="star-outline" value={`${provider.rating.toFixed(1)} · ${provider.reviews}`} /> : <InfoBit language={language} icon="briefcase-outline" value={ur ? `${provider.yearsExperience} سال تجربہ` : `${provider.yearsExperience} yrs experience`} />}
    </View>
    {!compact ? <AppText language={language} size={9} color={colors.muted}>{ur ? `درخواست ${formatDate(provider.createdAt, language)}` : `Applied ${formatDate(provider.createdAt, language)} · ${provider.completedJobs} completed jobs`}</AppText> : null}
    {status === 'pending' ? <View style={[styles.providerActions, ur && styles.rtlRow]}><Button language={language} title={text(language, 'approve')} icon="checkmark" onPress={() => onAction('approved')} style={{ flex: 1, minHeight: 39 }} /><Button language={language} title={text(language, 'suspend')} icon="close" variant="outline" onPress={() => onAction('suspended')} style={{ minHeight: 39 }} /></View> : status === 'approved' ? <Button language={language} title={ur ? 'معطل کریں' : 'Suspend provider'} icon="pause-circle-outline" variant="outline" onPress={() => onAction('suspended')} style={{ minHeight: 39, marginTop: 3 }} /> : <Button language={language} title={ur ? 'دوبارہ فعال کریں' : 'Reactivate provider'} icon="checkmark-circle-outline" variant="secondary" onPress={() => onAction('approved')} style={{ minHeight: 39, marginTop: 3 }} />}
  </Card>;
}

function BookingCard({ language, booking, onAction, compact = false }: { language: Language; booking: Booking; onAction: (booking: Booking, status: BookingStatus) => void; compact?: boolean }) {
  const ur = language === 'ur';
  const nextStatus = nextBookingStatus(booking);
  const title = ur ? booking.serviceNameUr : booking.serviceNameEn;
  const canCancel = !['completed', 'cancelled'].includes(booking.status);
  return <Card style={[styles.bookingCard, compact && styles.bookingCompact]}>
    <View style={[styles.bookingTop, ur && styles.rtlRow]}>
      <View style={{ flex: 1 }}><View style={[styles.bookingTitleRow, ur && styles.rtlRow]}><AppText language={language} size={12} weight="bold" numberOfLines={1} style={{ flex: 1 }}>{title} · {ur ? booking.subtypeUr : booking.subtypeEn}</AppText><Pill language={language} label={bookingStatusLabel(language, booking.status)} tone={booking.status === 'completed' ? 'mint' : booking.status === 'cancelled' ? 'red' : booking.status === 'pending' ? 'orange' : 'blue'} /></View><AppText language="en" size={9} color={colors.muted}>{booking.id}</AppText></View>
    </View>
    <View style={styles.bookingDetails}>
      <View style={[styles.detailRow, ur && styles.rtlRow]}><Ionicons name="person-outline" size={13} color={colors.muted} /><AppText language={language} size={10} color={colors.inkSoft} style={{ flex: 1 }}>{booking.customerName || (ur ? 'گاہک' : 'Customer')} · {booking.providerName || booking.preferredProviderName || (ur ? 'ماہر تفویض نہیں' : 'No provider assigned')}</AppText></View>
      <View style={[styles.detailRow, ur && styles.rtlRow]}><Ionicons name="location-outline" size={13} color={colors.muted} /><AppText language={language} size={10} color={colors.inkSoft} numberOfLines={1} style={{ flex: 1 }}>{booking.address}</AppText></View>
      <View style={[styles.detailRow, ur && styles.rtlRow]}><Ionicons name="time-outline" size={13} color={colors.muted} /><AppText language={language} size={10} color={colors.inkSoft}>{formatDate(booking.scheduledAt, language)} · {formatPKR(booking.price)}</AppText></View>
      {!compact && booking.description ? <AppText language={language} size={10} color={colors.muted} numberOfLines={2} style={{ marginTop: 2 }}>{booking.description}</AppText> : null}
    </View>
    {canCancel || nextStatus ? <View style={[styles.bookingActions, ur && styles.rtlRow]}>
      {nextStatus ? <Button language={language} title={bookingActionLabel(language, nextStatus)} icon="arrow-forward" onPress={() => onAction(booking, nextStatus)} style={{ flex: 1, minHeight: 37 }} /> : null}
      {canCancel ? <Button language={language} title={ur ? 'منسوخ' : 'Cancel'} icon="close" variant="outline" onPress={() => onAction(booking, 'cancelled')} style={{ minHeight: 37 }} /> : null}
    </View> : null}
  </Card>;
}

function ConfirmationModal({ language, action, busy, onCancel, onConfirm }: { language: Language; action: ConfirmAction | null; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const ur = language === 'ur';
  if (!action) return null;
  const isCancel = action.kind === 'booking' && action.status === 'cancelled';
  const isSuspend = action.kind === 'provider' && action.status === 'suspended';
  const title = action.kind === 'provider'
    ? (isSuspend ? (ur ? 'پروفیشنل معطل کریں؟' : 'Suspend this provider?') : (ur ? 'درخواست منظور کریں؟' : 'Approve this application?'))
    : isCancel ? (ur ? 'بکنگ منسوخ کریں؟' : 'Cancel this booking?') : (ur ? 'بکنگ کا مرحلہ تبدیل کریں؟' : 'Move booking to the next step?');
  const description = action.kind === 'provider'
    ? (isSuspend ? (ur ? `${action.provider.name} نئی بکنگز حاصل نہیں کر سکیں گے۔ یہ تبدیلی فوراً لاگو ہوگی۔` : `${action.provider.name} will no longer be eligible for new jobs. This takes effect immediately.`) : (ur ? `${action.provider.name} منظور ہو جائیں گے اور اہل بکنگز دیکھ سکیں گے۔` : `${action.provider.name} will be approved and become eligible for matching jobs.`))
    : isCancel ? (ur ? `بکنگ ${action.booking.id} منسوخ ہوگی۔ یہ قدم واپس نہیں لیا جا سکتا۔` : `Booking ${action.booking.id} will be cancelled. This action cannot be undone.`) : (ur ? `بکنگ ${action.booking.id} کو اگلے مرحلے میں منتقل کیا جائے گا۔` : `Booking ${action.booking.id} will move to ${bookingStatusLabel(language, action.status)}.`);
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.modalBackdrop}><View style={styles.confirmCard}>
      <View style={[styles.confirmIcon, isCancel || isSuspend ? styles.confirmIconDanger : styles.confirmIconInfo]}><Ionicons name={isCancel || isSuspend ? 'warning-outline' : 'shield-checkmark-outline'} size={22} color={isCancel || isSuspend ? colors.red : colors.jade} /></View>
      <AppText language={language} size={18} weight="bold" style={{ marginTop: 10 }}>{title}</AppText>
      <AppText language={language} size={12} color={colors.muted} style={{ marginTop: 5 }}>{description}</AppText>
      <View style={[styles.modalActions, ur && styles.rtlRow]}>
        <Button language={language} title={ur ? 'واپس' : 'Go back'} variant="outline" onPress={onCancel} disabled={busy} style={{ flex: 1 }} />
        <Button language={language} title={busy ? (ur ? 'محفوظ ہو رہا ہے…' : 'Saving…') : (isCancel || isSuspend ? (ur ? 'تصدیق کریں' : 'Confirm change') : (ur ? 'جاری رکھیں' : 'Continue'))} variant={isCancel || isSuspend ? 'danger' : 'primary'} onPress={onConfirm} disabled={busy} style={{ flex: 1 }} />
      </View>
    </View></View>
  </Modal>;
}

function MetricCard({ language, icon, label, value, tint, onPress }: { language: Language; icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tint: string; onPress?: () => void }) {
  return <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => [styles.metricCard, { opacity: pressed && onPress ? 0.8 : 1 }]}><View style={[styles.metricIcon, { backgroundColor: tint }]}><Ionicons name={icon} size={17} color={colors.forest} /></View><AppText language="en" size={19} weight="bold" style={{ marginTop: 7 }}>{value}</AppText><AppText language={language} size={10} color={colors.muted}>{label}</AppText></Pressable>;
}
function AttentionCard({ language, icon, label, value, detail, tint, onPress }: { language: Language; icon: keyof typeof Ionicons.glyphMap; label: string; value: string; detail: string; tint: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.attentionCard, { opacity: pressed ? 0.84 : 1 }]}><View style={[styles.attentionIcon, { backgroundColor: tint }]}><Ionicons name={icon} size={17} color={colors.forest} /></View><AppText language={language} size={10} weight="bold" color={colors.muted}>{label}</AppText><AppText language="en" size={22} weight="bold">{value}</AppText><AppText language={language} size={9} color={colors.muted}>{detail}</AppText></Pressable>;
}
function SectionHeading({ language, title, action, onPress }: { language: Language; title: string; action: string; onPress: () => void }) {
  return <View style={[styles.sectionHeading, language === 'ur' && styles.rtlRow]}><AppText language={language} size={15} weight="bold" style={{ flex: 1 }}>{title}</AppText><Pressable onPress={onPress} style={[styles.linkButton, language === 'ur' && styles.rtlRow]}><AppText language={language} size={10} weight="bold" color={colors.jade}>{action}</AppText><Ionicons name={language === 'ur' ? 'arrow-back' : 'arrow-forward'} size={13} color={colors.jade} /></Pressable></View>;
}
function FilterChip({ language, selected, label, count, onPress }: { language: Language; selected: boolean; label: string; count?: number; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.filterChip, selected && styles.filterChipSelected, language === 'ur' && styles.rtlRow]}><AppText language={language} size={10} weight="bold" color={selected ? colors.white : colors.inkSoft}>{label}</AppText>{count !== undefined ? <AppText language="en" size={9} weight="bold" color={selected ? '#E3F2E9' : colors.muted}>{count}</AppText> : null}</Pressable>;
}
function InfoBit({ language, icon, value }: { language: Language; icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return <View style={[styles.infoBit, language === 'ur' && styles.rtlRow]}><Ionicons name={icon} size={12} color={colors.muted} /><AppText language={language} size={9} color={colors.inkSoft} numberOfLines={1}>{value}</AppText></View>;
}
function EmptyCard({ language, icon, title, caption }: { language: Language; icon: keyof typeof Ionicons.glyphMap; title: string; caption: string }) {
  return <Card style={styles.emptyCard}><IconCircle name={icon} background={colors.mint} color={colors.jade} size={42} /><AppText language={language} size={13} weight="bold">{title}</AppText><AppText language={language} size={10} color={colors.muted}>{caption}</AppText></Card>;
}

function nextBookingStatus(booking: Booking): BookingStatus | null {
  if (booking.status === 'pending') return booking.providerId ? 'accepted' : null;
  if (booking.status === 'accepted') return 'on_the_way';
  if (booking.status === 'on_the_way') return 'in_progress';
  if (booking.status === 'in_progress') return 'completed';
  return null;
}
function bookingActionLabel(language: Language, status: BookingStatus) {
  const labels: Record<BookingStatus, [string, string]> = {
    pending: ['Pending', 'زیرِ جائزہ'], accepted: ['Confirm acceptance', 'قبولیت کی تصدیق'], on_the_way: ['Mark on the way', 'راستے میں'],
    in_progress: ['Start work', 'کام شروع کریں'], completed: ['Complete job', 'کام مکمل کریں'], cancelled: ['Cancel booking', 'بکنگ منسوخ کریں'],
  };
  return labels[status][language === 'ur' ? 1 : 0];
}
function bookingStatusLabel(language: Language, status: BookingStatus) {
  const labels: Record<BookingStatus, [string, string]> = {
    pending: ['Pending', 'زیرِ جائزہ'], accepted: ['Accepted', 'قبول شدہ'], on_the_way: ['On the way', 'راستے میں'],
    in_progress: ['In progress', 'کام جاری'], completed: ['Completed', 'مکمل'], cancelled: ['Cancelled', 'منسوخ'],
  };
  return labels[status][language === 'ur' ? 1 : 0];
}
function providerStatusLabel(language: Language, status: AdminProviderRecord['status']) {
  return status === 'approved' ? (language === 'ur' ? 'منظور شدہ' : 'Approved') : status === 'suspended' ? (language === 'ur' ? 'معطل' : 'Suspended') : (language === 'ur' ? 'زیرِ جائزہ' : 'Pending');
}
function providerFilterLabel(language: Language, filter: ProviderFilter) {
  const labels: Record<ProviderFilter, [string, string]> = { all: ['All', 'سب'], pending: ['Pending', 'زیرِ جائزہ'], approved: ['Approved', 'منظور شدہ'], suspended: ['Suspended', 'معطل'] };
  return labels[filter][language === 'ur' ? 1 : 0];
}
function bookingFilterLabel(language: Language, filter: BookingFilter) {
  const labels: Record<BookingFilter, [string, string]> = { all: ['All', 'سب'], active: ['Active', 'فعال'], pending: ['Pending', 'زیرِ جائزہ'], in_progress: ['In progress', 'کام جاری'], completed: ['Completed', 'مکمل'], cancelled: ['Cancelled', 'منسوخ'] };
  return labels[filter][language === 'ur' ? 1 : 0];
}
function categoryTitle(rows: ServiceCategory[], id: string, language: Language) {
  const item = rows.find((category) => category.id === id) ?? categories.find((category) => category.id === id);
  return item ? (language === 'ur' ? item.titleUr : item.titleEn) : id;
}
function iconName(name: string): keyof typeof Ionicons.glyphMap {
  return (name in Ionicons.glyphMap ? name : 'construct') as keyof typeof Ionicons.glyphMap;
}
function formatDate(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'ur' ? 'ur-PK' : 'en-PK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.forest, borderRadius: radius.lg, padding: 16, gap: 15 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 11 }, heroFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.17)', paddingTop: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 }, refreshButton: { width: 32, height: 32, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, metricCard: { width: '48%', flexGrow: 1, minHeight: 102, padding: 12, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line }, metricIcon: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabStrip: { gap: 7, paddingRight: 3 }, tabButton: { minHeight: 39, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 6 }, tabButtonActive: { backgroundColor: colors.forest, borderColor: colors.forest }, tabBadge: { minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }, tabBadgeActive: { backgroundColor: colors.lime },
  contentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, searchBox: { width: 168, minHeight: 37, paddingHorizontal: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 6 }, searchInput: { flex: 1, fontSize: 11, color: colors.ink, outlineStyle: 'none' as any, paddingVertical: 7 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.mint, padding: 10 }, noticeError: { backgroundColor: colors.redSoft }, loading: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 9 }, footerNote: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  welcomeCard: { padding: 15, gap: 15 }, welcomeHead: { flexDirection: 'row', alignItems: 'center', gap: 10 }, healthStrip: { minHeight: 39, backgroundColor: '#F6F8F4', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 }, healthIcon: { width: 25, height: 25, borderRadius: 9, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  attentionGrid: { flexDirection: 'row', gap: 9 }, attentionCard: { flex: 1, minHeight: 124, padding: 12, gap: 2, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md }, attentionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  section: { gap: 10 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, linkButton: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 4 }, providerCard: { gap: 10, padding: 12 }, providerCompact: { paddingVertical: 10 }, providerTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, avatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, providerInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F3EF' }, infoBit: { flexDirection: 'row', alignItems: 'center', gap: 4 }, providerActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  bookingTip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: colors.blueSoft, borderColor: '#DCE7FA' }, filterStrip: { flexDirection: 'row', alignItems: 'center', gap: 7 }, filterChip: { minHeight: 32, borderRadius: radius.pill, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 5 }, filterChipSelected: { backgroundColor: colors.forest, borderColor: colors.forest },
  bookingCard: { gap: 9, padding: 12 }, bookingCompact: { paddingVertical: 10 }, bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, bookingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, bookingDetails: { gap: 5 }, detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, bookingActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  serviceCard: { padding: 12, gap: 10 }, serviceTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, subtypeList: { borderTopWidth: 1, borderTopColor: '#F0F3EF', paddingTop: 7, gap: 2 }, subtypeRow: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: 7 }, subtypeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.jade }, promoHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 7 }, promoCard: { padding: 12 }, promoIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' }, promoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noPayments: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11 }, emptyCard: { alignItems: 'center', gap: 6, padding: 19 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(11,31,25,0.48)', alignItems: 'center', justifyContent: 'center', padding: 22 }, confirmCard: { width: '100%', maxWidth: 420, backgroundColor: colors.white, borderRadius: 22, padding: 20, alignItems: 'stretch' }, confirmIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, confirmIconDanger: { backgroundColor: colors.redSoft }, confirmIconInfo: { backgroundColor: colors.mint }, modalActions: { flexDirection: 'row', gap: 9, marginTop: 18 },
  rtlRow: { flexDirection: 'row-reverse' },
});
