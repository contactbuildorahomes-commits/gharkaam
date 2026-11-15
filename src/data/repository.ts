import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { categories, demoBookings } from './mock';
import { supabase } from '../lib/supabase';
import type { AppUser, Booking, BookingDraft, BookingStatus, ServiceCategory, SessionMode } from '../types';

const DEMO_BOOKINGS_KEY = 'gharkaam.demo.bookings.v1';
const DEMO_ADMIN_KEY = 'gharkaam.demo.admin.v1';
const createId = () => `GK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

export interface DemoAdminOverrides {
  providerStatuses: Record<string, 'pending' | 'approved' | 'suspended'>;
  serviceCategoryActive: Record<string, boolean>;
  promotionActive: Record<string, boolean>;
}

const emptyDemoAdminOverrides = (): DemoAdminOverrides => ({ providerStatuses: {}, serviceCategoryActive: {}, promotionActive: {} });

export async function loadDemoAdminOverrides(): Promise<DemoAdminOverrides> {
  const stored = await AsyncStorage.getItem(DEMO_ADMIN_KEY);
  if (!stored) return emptyDemoAdminOverrides();
  try {
    const parsed = JSON.parse(stored);
    return {
      providerStatuses: parsed?.providerStatuses && typeof parsed.providerStatuses === 'object' ? parsed.providerStatuses : {},
      serviceCategoryActive: parsed?.serviceCategoryActive && typeof parsed.serviceCategoryActive === 'object' ? parsed.serviceCategoryActive : {},
      promotionActive: parsed?.promotionActive && typeof parsed.promotionActive === 'object' ? parsed.promotionActive : {},
    };
  } catch {
    return emptyDemoAdminOverrides();
  }
}

async function saveDemoAdminOverride<K extends keyof DemoAdminOverrides>(key: K, id: string, value: DemoAdminOverrides[K][string]) {
  const current = await loadDemoAdminOverrides();
  const next = { ...current, [key]: { ...current[key], [id]: value } };
  await AsyncStorage.setItem(DEMO_ADMIN_KEY, JSON.stringify(next));
}

async function readDemoBookings(): Promise<Booking[]> {
  const stored = await AsyncStorage.getItem(DEMO_BOOKINGS_KEY);
  if (!stored) {
    await AsyncStorage.setItem(DEMO_BOOKINGS_KEY, JSON.stringify(demoBookings));
    return demoBookings;
  }
  try { return JSON.parse(stored) as Booking[]; } catch { return demoBookings; }
}
async function saveDemoBookings(bookings: Booking[]) { await AsyncStorage.setItem(DEMO_BOOKINGS_KEY, JSON.stringify(bookings)); }

function mapDbBooking(row: any): Booking {
  const category = categories.find((item) => item.id === row.service_category_id);
  const subtype = category?.subtypes.find((item) => item.id === row.subtype_id);
  return {
    id: row.id,
    serviceId: row.service_category_id,
    serviceNameUr: category?.titleUr ?? row.service_category_id,
    serviceNameEn: category?.titleEn ?? row.service_category_id,
    subtypeUr: subtype?.titleUr ?? row.subtype_id,
    subtypeEn: subtype?.titleEn ?? row.subtype_id,
    providerId: row.provider_id,
    providerName: row.provider_name ?? '',
    preferredProviderName: row.preferred_provider_name ?? '',
    customerName: row.customer_name,
    description: row.description,
    address: row.service_address,
    scheduledAt: row.scheduled_at,
    status: row.status,
    paymentMethod: row.payment_method,
    promoCode: row.promo_code,
    price: row.estimated_price_pkr,
    photoUri: row.photo_path,
    createdAt: row.created_at,
  };
}

async function uploadPhoto(uri: string, userId: string, bookingId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is unavailable.');
  let bytes: ArrayBuffer;
  let mime = 'image/jpeg';
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    bytes = await response.arrayBuffer();
    mime = response.headers.get('content-type') || mime;
  } else {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    bytes = decode(base64);
  }
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('booking-photos').upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
}

export async function createBooking(draft: BookingDraft, user: AppUser | null, mode: SessionMode): Promise<Booking> {
  const category = categories.find((item) => item.id === draft.serviceId);
  const subtype = category?.subtypes.find((item) => item.id === draft.subtypeId);
  if (mode === 'authenticated' && user && supabase) {
    const { data, error } = await supabase.rpc('customer_create_booking', {
      p_service_category_id: draft.serviceId,
      p_subtype_id: draft.subtypeId,
      p_description: draft.description,
      p_service_address: draft.address,
      p_scheduled_at: draft.scheduledAt,
      p_payment_method: draft.paymentMethod,
      p_promo_code: draft.promoCode ?? null,
      p_preferred_provider_name: draft.provider.nameEn,
    });
    if (error) throw error;
    let row = data;
    if (draft.photoUri) {
      try {
        const photoPath = await uploadPhoto(draft.photoUri, user.id, row.id);
        const { data: attached, error: attachError } = await supabase.rpc('customer_attach_booking_photo', { p_booking_id: row.id, p_photo_path: photoPath });
        if (attachError) throw attachError;
        row = attached;
      } catch {
        return { ...mapDbBooking(row), photoUploadFailed: true };
      }
    }
    return mapDbBooking(row);
  }
  const booking: Booking = {
    id: createId(), serviceId: draft.serviceId, serviceNameUr: category?.titleUr ?? '', serviceNameEn: category?.titleEn ?? '',
    subtypeUr: subtype?.titleUr ?? '', subtypeEn: subtype?.titleEn ?? '', providerId: draft.provider.id, providerName: draft.provider.nameUr, preferredProviderName: draft.provider.nameUr,
    customerName: user?.displayName ?? 'احمد خان', description: draft.description, address: draft.address, scheduledAt: draft.scheduledAt,
    status: 'accepted', paymentMethod: draft.paymentMethod, promoCode: draft.promoCode, price: draft.price, photoUri: draft.photoUri, createdAt: new Date().toISOString(),
  };
  const existing = await readDemoBookings();
  await saveDemoBookings([booking, ...existing]);
  return booking;
}

export async function listBookings(user: AppUser | null, mode: SessionMode): Promise<Booking[]> {
  if (mode === 'authenticated' && user && supabase) {
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(user.role === 'admin' ? 1000 : 100);
    if (error) throw error;
    const { data: ratings, error: ratingsError } = user.role === 'customer'
      ? await supabase.from('reviews').select('booking_id, rating').eq('customer_id', user.id).limit(100)
      : { data: [], error: null };
    if (ratingsError) throw ratingsError;
    return (data ?? []).map((row) => ({ ...mapDbBooking(row), rating: ratings?.find((review) => review.booking_id === row.id)?.rating }));
  }
  return readDemoBookings();
}

export async function listProviderOpenJobs(user: AppUser | null, mode: SessionMode): Promise<Booking[]> {
  if (mode !== 'authenticated' || !user || user.role !== 'provider' || !supabase) return [];
  const { data, error } = await supabase.rpc('provider_list_open_jobs');
  if (error) throw error;
  return (data ?? []).map((row: any) => {
    const category = categories.find((item) => item.id === row.service_category_id);
    const subtype = category?.subtypes.find((item) => item.id === row.subtype_id);
    return {
      id: row.id,
      serviceId: row.service_category_id,
      serviceNameUr: category?.titleUr ?? row.service_category_id,
      serviceNameEn: category?.titleEn ?? row.service_category_id,
      subtypeUr: subtype?.titleUr ?? row.subtype_id,
      subtypeEn: subtype?.titleEn ?? row.subtype_id,
      providerId: null,
      providerName: '',
      customerName: '',
      description: row.description,
      address: 'Address shared after accepting',
      scheduledAt: row.scheduled_at,
      status: 'pending' as const,
      paymentMethod: 'cash' as const,
      price: row.estimated_price_pkr,
      createdAt: row.created_at,
    } satisfies Booking;
  });
}

export async function setBookingStatus(booking: Booking, next: BookingStatus, user: AppUser | null, mode: SessionMode): Promise<Booking> {
  if (mode === 'authenticated' && user && supabase) {
    const rpc = user.role === 'provider' ? 'provider_set_booking_status' : user.role === 'admin' ? 'admin_set_booking_status' : null;
    if (rpc) {
      const { data, error } = await supabase.rpc(rpc, { p_booking_id: booking.id, p_next_status: next });
      if (error) throw error;
      return mapDbBooking(data);
    }
    if (user.role === 'customer' && next === 'cancelled') {
      const { data, error } = await supabase.rpc('customer_cancel_booking', { p_booking_id: booking.id });
      if (error) throw error;
      return mapDbBooking(data);
    }
    throw new Error('This role cannot change the booking status.');
  }
  const rows = await readDemoBookings();
  const updated = rows.map((item) => item.id === booking.id ? { ...item, status: next } : item);
  await saveDemoBookings(updated);
  return updated.find((item) => item.id === booking.id) ?? booking;
}

export async function saveRating(booking: Booking, rating: number, user: AppUser | null, mode: SessionMode): Promise<void> {
  if (mode === 'authenticated' && user && supabase) {
    const { error } = await supabase.from('reviews').insert({ booking_id: booking.id, customer_id: user.id, provider_id: booking.providerId ?? null, rating });
    if (error) throw error;
    return;
  }
  const rows = await readDemoBookings();
  await saveDemoBookings(rows.map((item) => item.id === booking.id ? { ...item, rating } : item));
}

export async function setProviderApproval(providerId: string, status: 'approved' | 'suspended', mode: SessionMode) {
  if (mode === 'authenticated' && supabase) {
    const { error } = await supabase.rpc('admin_set_provider_status', { p_provider_id: providerId, p_status: status });
    if (error) throw error;
  } else if (mode === 'demo') await saveDemoAdminOverride('providerStatuses', providerId, status);
}

export async function setCategoryActive(categoryId: string, active: boolean, mode: SessionMode) {
  if (mode === 'authenticated' && supabase) {
    const { error } = await supabase.rpc('admin_set_category_active', { p_category_id: categoryId, p_is_active: active });
    if (error) throw error;
  } else if (mode === 'demo') await saveDemoAdminOverride('serviceCategoryActive', categoryId, active);
}

export async function setPromoActive(code: string, active: boolean, mode: SessionMode) {
  if (mode === 'authenticated' && supabase) {
    const { error } = await supabase.rpc('admin_set_promo_active', { p_code: code, p_active: active });
    if (error) throw error;
  } else if (mode === 'demo') await saveDemoAdminOverride('promotionActive', code, active);
}

export interface AdminProviderRecord {
  id: string;
  name: string;
  phone: string;
  serviceArea: string;
  categoryIds: string[];
  yearsExperience: number;
  status: 'pending' | 'approved' | 'suspended';
  rating: number;
  reviews: number;
  completedJobs: number;
  createdAt: string;
}

export interface AdminPromotion {
  code: string;
  titleEn: string;
  titleUr: string;
  discountPercent: number;
  active: boolean;
  expiresAt: string | null;
  usageLimit: number | null;
}

export interface AdminSnapshot {
  customers: number;
  totalProviders: number;
  pendingProviders: number;
  approvedProviders: number;
  suspendedProviders: number;
  totalBookings: number;
  activeBookings: number;
  providers: AdminProviderRecord[];
  serviceCategories: ServiceCategory[];
  promotions: AdminPromotion[];
}

export async function loadAdminSnapshot(): Promise<AdminSnapshot> {
  if (!supabase) throw new Error('Supabase is unavailable.');
  const [customersResult, providerCountResult, pendingCountResult, approvedCountResult, suspendedCountResult, bookingCountResult, activeBookingCountResult, providersResult, categoryResult, subtypeResult, promoResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('providers').select('id', { count: 'exact', head: true }),
    supabase.from('providers').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('providers').select('id', { count: 'exact', head: true }).eq('verification_status', 'approved'),
    supabase.from('providers').select('id', { count: 'exact', head: true }).eq('verification_status', 'suspended'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'on_the_way', 'in_progress']),
    supabase.from('providers').select('id, full_name, phone, service_area, service_category_ids, years_experience, verification_status, rating, review_count, completed_jobs, created_at').order('created_at', { ascending: false }).limit(1000),
    supabase.from('service_categories').select('id, name_en, name_ur, icon, is_active, sort_order').order('sort_order').limit(100),
    supabase.from('service_subtypes').select('id, category_id, name_en, name_ur, starting_price_pkr, is_active, sort_order').order('sort_order').limit(1000),
    supabase.from('promo_codes').select('code, title_en, title_ur, discount_percent, active, expires_at, usage_limit').order('created_at', { ascending: false }).limit(100),
  ]);
  const errors = [customersResult.error, providerCountResult.error, pendingCountResult.error, approvedCountResult.error, suspendedCountResult.error, bookingCountResult.error, activeBookingCountResult.error, providersResult.error, categoryResult.error, subtypeResult.error, promoResult.error];
  const firstError = errors.find(Boolean);
  if (firstError) throw firstError;
  const serviceCategories: ServiceCategory[] = (categoryResult.data ?? []).map((row) => {
    const fallback = categories.find((item) => item.id === row.id);
    return {
      id: row.id,
      titleEn: row.name_en,
      titleUr: row.name_ur,
      icon: row.icon,
      color: fallback?.color ?? '#E5F0E9',
      available: row.is_active,
      subtypes: (subtypeResult.data ?? []).filter((subtype) => subtype.category_id === row.id).map((subtype) => ({
        id: subtype.id,
        titleEn: subtype.name_en,
        titleUr: subtype.name_ur,
        startingPrice: subtype.starting_price_pkr,
      })),
    };
  });
  return {
    customers: customersResult.count ?? 0,
    totalProviders: providerCountResult.count ?? 0,
    pendingProviders: pendingCountResult.count ?? 0,
    approvedProviders: approvedCountResult.count ?? 0,
    suspendedProviders: suspendedCountResult.count ?? 0,
    totalBookings: bookingCountResult.count ?? 0,
    activeBookings: activeBookingCountResult.count ?? 0,
    providers: (providersResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.full_name,
      phone: row.phone ?? '',
      serviceArea: row.service_area,
      categoryIds: row.service_category_ids ?? [],
      yearsExperience: row.years_experience,
      status: row.verification_status,
      rating: Number(row.rating ?? 0),
      reviews: row.review_count ?? 0,
      completedJobs: row.completed_jobs ?? 0,
      createdAt: row.created_at,
    })),
    serviceCategories,
    promotions: (promoResult.data ?? []).map((row) => ({
      code: row.code,
      titleEn: row.title_en,
      titleUr: row.title_ur,
      discountPercent: row.discount_percent,
      active: row.active,
      expiresAt: row.expires_at,
      usageLimit: row.usage_limit,
    })),
  };
}

export async function loadMarketplaceSettings() {
  if (!supabase) throw new Error('Supabase is unavailable.');
  const [categoryResult, subtypeResult, promoResult] = await Promise.all([
    supabase.from('service_categories').select('id, name_en, name_ur, icon, is_active, sort_order').order('sort_order').limit(100),
    supabase.from('service_subtypes').select('id, category_id, name_en, name_ur, starting_price_pkr, is_active, sort_order').order('sort_order').limit(500),
    supabase.from('promo_codes').select('code, active, expires_at').eq('code', 'PEHLI15').maybeSingle(),
  ]);
  if (categoryResult.error) throw categoryResult.error;
  if (subtypeResult.error) throw subtypeResult.error;
  if (promoResult.error) throw promoResult.error;
  const serviceCategories = (categoryResult.data ?? []).map((row) => ({
    id: row.id, titleEn: row.name_en, titleUr: row.name_ur, icon: row.icon,
    color: categories.find((item) => item.id === row.id)?.color ?? '#E5F0E9',
    available: row.is_active,
    subtypes: (subtypeResult.data ?? []).filter((subtype) => subtype.category_id === row.id && subtype.is_active).map((subtype) => ({
      id: subtype.id, titleEn: subtype.name_en, titleUr: subtype.name_ur, startingPrice: subtype.starting_price_pkr,
    })),
  }));
  const promo = promoResult.data;
  return { serviceCategories, promoAvailable: Boolean(promo?.active && (!promo.expires_at || new Date(promo.expires_at) > new Date())) };
}
