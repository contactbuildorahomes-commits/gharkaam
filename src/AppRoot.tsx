import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import type { AppRoute, AppUser, Booking, BookingDraft, BookingStatus, Language, ServiceCategory, SessionMode, UserRole } from './types';
import { colors } from './theme/tokens';
import { restoreSignedInUser, signOut } from './lib/auth';
import { createBooking, listBookings, loadMarketplaceSettings, saveRating, setBookingStatus } from './data/repository';
import { categories } from './data/mock';
import { text } from './i18n/translations';
import { AppFrame } from './components/AppFrame';
import { AppText } from './components/ui';
import { RoleSelectScreen } from './screens/RoleSelectScreen';
import { AuthScreen } from './screens/AuthScreen';
import { CustomerHomeScreen } from './screens/CustomerHomeScreen';
import { BookingFlowScreen } from './screens/BookingFlowScreen';
import { BookingsScreen } from './screens/BookingsScreen';
import { TrackingScreen } from './screens/TrackingScreen';
import { ProviderScreen } from './screens/ProviderScreen';
import { AdminScreen } from './screens/AdminScreen';
import { ProfileScreen } from './screens/ProfileScreen';

export default function AppRoot() {
  const [fontsLoaded] = useFonts({ NotoNastaliqUrdu_400Regular });
  const [language, setLanguage] = useState<Language>('ur');
  const [screen, setScreen] = useState<'entry' | 'auth' | AppRoute>('entry');
  const [role, setRole] = useState<UserRole>('customer');
  const [authRole, setAuthRole] = useState<UserRole>('customer');
  const [mode, setMode] = useState<SessionMode>('demo');
  const [user, setUser] = useState<AppUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [initialCategory, setInitialCategory] = useState<ServiceCategory | undefined>();
  const [notice, setNotice] = useState('');
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(categories);
  const [promoAvailable, setPromoAvailable] = useState(true);

  useEffect(() => {
    restoreSignedInUser().then((restored) => {
      if (restored) {
        setUser(restored); setRole(restored.role); setMode('authenticated');
        setScreen(restored.role === 'customer' ? 'home' : restored.role === 'provider' ? 'provider' : 'admin');
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (screen === 'entry' || screen === 'auth') return;
    let mounted = true;
    const refresh = () => listBookings(user, mode).then((rows) => {
      if (!mounted) return;
      setBookings(rows);
      setSelectedBooking((selected) => selected ? rows.find((row) => row.id === selected.id) ?? selected : null);
    }).catch((error: any) => {
      if (!mounted) return;
      setNotice(error?.message ?? 'Could not load bookings.');
    });
    void refresh();
    const timer = mode === 'authenticated' ? setInterval(refresh, 15000) : undefined;
    return () => { mounted = false; if (timer) clearInterval(timer); };
  }, [role, mode, user?.id, screen]);

  useEffect(() => {
    if (mode === 'demo') { setServiceCategories(categories); setPromoAvailable(true); return; }
    if (role !== 'customer' || screen === 'entry' || screen === 'auth') return;
    let mounted = true;
    loadMarketplaceSettings().then((settings) => {
      if (mounted) { setServiceCategories(settings.serviceCategories); setPromoAvailable(settings.promoAvailable); }
    }).catch((error: any) => {
      if (mounted) { setServiceCategories([]); setPromoAvailable(false); setNotice(error?.message ?? 'Could not load services.'); }
    });
    return () => { mounted = false; };
  }, [role, mode, user?.id, screen]);

  const toggleLanguage = () => setLanguage((value) => value === 'ur' ? 'en' : 'ur');
  const enterDemo = (selectedRole: UserRole) => {
    setUser(null); setRole(selectedRole); setMode('demo'); setNotice('');
    setScreen(selectedRole === 'customer' ? 'home' : selectedRole === 'provider' ? 'provider' : 'admin');
  };
  const goLogin = (selectedRole: UserRole) => { setAuthRole(selectedRole); setScreen('auth'); };
  const onAuthenticated = (signedInUser: AppUser) => {
    setUser(signedInUser); setRole(signedInUser.role); setMode('authenticated'); setNotice('');
    setScreen(signedInUser.role === 'customer' ? 'home' : signedInUser.role === 'provider' ? 'provider' : 'admin');
  };
  const goRoute = (route: AppRoute) => {
    setNotice('');
    if ((role === 'customer' && ['home', 'bookings', 'profile', 'tracking', 'booking'].includes(route)) || (role === 'provider' && ['provider', 'profile'].includes(route)) || (role === 'admin' && ['admin', 'profile'].includes(route))) setScreen(route);
  };
  const startBooking = (category?: ServiceCategory) => { setInitialCategory(category); setNotice(''); setScreen('booking'); };
  const confirmBooking = async (draft: BookingDraft) => {
    try {
      const created = await createBooking(draft, user, mode);
      setBookings((rows) => [created, ...rows]); setSelectedBooking(created); setScreen('tracking');
      setNotice(created.photoUploadFailed ? (language === 'ur' ? 'بکنگ محفوظ ہو گئی، مگر تصویر اپ لوڈ نہیں ہو سکی۔ دوبارہ بکنگ نہ کریں۔' : 'Booking saved, but the optional photo could not upload. Do not book again.') : '');
    } catch (error: any) { setNotice(error?.message ?? 'Could not save booking.'); }
  };
  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    const updated = await setBookingStatus(booking, status, user, mode);
    setBookings((rows) => rows.some((row) => row.id === updated.id) ? rows.map((row) => row.id === updated.id ? updated : row) : [updated, ...rows]);
    if (selectedBooking?.id === updated.id) setSelectedBooking(updated);
  };
  const rateBooking = async (booking: Booking, rating: number) => {
    try {
      await saveRating(booking, rating, user, mode);
      setBookings((rows) => rows.map((row) => row.id === booking.id ? { ...row, rating } : row));
      if (selectedBooking?.id === booking.id) setSelectedBooking({ ...selectedBooking, rating });
    } catch (error: any) { setNotice(error?.message ?? 'Could not save rating.'); }
  };
  const leaveSession = async () => {
    try { if (mode === 'authenticated') await signOut(); } catch { /* Local reset still returns to the entry flow. */ }
    setUser(null); setRole('customer'); setMode('demo'); setBookings([]); setSelectedBooking(null); setNotice(''); setScreen('entry');
  };

  if (!fontsLoaded) return <SafeAreaProvider><View style={{ flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.jade} /></View></SafeAreaProvider>;
  if (screen === 'entry') return <SafeAreaProvider><StatusBar style="dark" /><SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}><RoleSelectScreen language={language} onToggleLanguage={toggleLanguage} onDemo={enterDemo} onLogin={goLogin} /></SafeAreaView></SafeAreaProvider>;
  if (screen === 'auth') return <SafeAreaProvider><StatusBar style="dark" /><SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream }}><AuthScreen language={language} role={authRole} onBack={() => setScreen('entry')} onSuccess={onAuthenticated} /></SafeAreaView></SafeAreaProvider>;

  const activeRoute = screen as AppRoute;
  let content: React.ReactNode = null;
  if (activeRoute === 'home' && role === 'customer') content = <CustomerHomeScreen language={language} name={user?.displayName ?? ''} bookings={bookings} serviceCategories={serviceCategories} promoAvailable={promoAvailable} onBook={startBooking} onTrack={(booking) => { setSelectedBooking(booking); setScreen('tracking'); }} onBookings={() => setScreen('bookings')} />;
  else if (activeRoute === 'booking' && role === 'customer') content = <BookingFlowScreen language={language} initialCategory={initialCategory} serviceCategories={serviceCategories} promoAvailable={promoAvailable} onBack={() => setScreen('home')} onConfirm={confirmBooking} />;
  else if (activeRoute === 'bookings' && role === 'customer') content = <BookingsScreen language={language} bookings={bookings} onTrack={(booking) => { setSelectedBooking(booking); setScreen('tracking'); }} onRate={rateBooking} />;
  else if (activeRoute === 'tracking' && role === 'customer') content = selectedBooking ? <TrackingScreen language={language} booking={selectedBooking} onBack={() => setScreen('bookings')} /> : <AppText language={language}>{text(language, 'noBookings')}</AppText>;
  else if (activeRoute === 'provider' && role === 'provider') content = <ProviderScreen language={language} user={user} mode={mode} bookings={bookings} onStatusChange={updateStatus} />;
  else if (activeRoute === 'admin' && role === 'admin') content = <AdminScreen language={language} user={user} mode={mode} bookings={bookings} onBookingStatus={updateStatus} />;
  else if (activeRoute === 'profile') content = <ProfileScreen language={language} user={user} role={role} isDemo={mode === 'demo'} onLeave={leaveSession} onChangeRole={() => setScreen('entry')} />;
  else content = <CustomerHomeScreen language={language} name={user?.displayName ?? ''} bookings={bookings} onBook={startBooking} onTrack={(booking) => { setSelectedBooking(booking); setScreen('tracking'); }} onBookings={() => setScreen('bookings')} />;

  return <SafeAreaProvider><StatusBar style="dark" /><AppFrame language={language} role={role} route={activeRoute} onRoute={goRoute} onToggleLanguage={toggleLanguage}><View style={{ gap: 12 }}>{notice ? <View style={{ backgroundColor: '#FDECEC', padding: 10, borderRadius: 12 }}><AppText language={language} size={11} color="#C85252">{notice}</AppText></View> : null}{content}</View></AppFrame></SafeAreaProvider>;
}
