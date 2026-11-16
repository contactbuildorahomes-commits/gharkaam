import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { categories, demoBookings } from './mock';
import { supabase } from '../lib/supabase';
import type { AppUser, Booking, BookingDraft, BookingStatus, ServiceCategory, ServiceSubtype, SessionMode } from '../types';

const DEMO_BOOKINGS_KEY = 'gharkaam.demo.bookings.v1';
const DEMO_ADMIN_KEY = 'gharkaam.demo.admin.v1';
const createId = () => `GK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

export interface DemoAdminOverrides {
  providerStatuses: Record<string, 'pending' | 'approved' | 'suspended'>;
  serviceCategoryActive: Record<string, boolean>;
  promotionActive: Record<string, boolean>;
  serviceCategories?: ServiceCategory[];
  promotions?: AdminPromotion[];
}

const emptyDemoAdminOverrides = (): DemoAdminOverrides => ({ providerStatuses: {}, serviceCategoryActive: {}, promotionActive: {} });
let demoAdminWriteQueue: Promise<void> = Promise.resolve();

export async function loadDemoAdminOverrides(): Promise<DemoAdminOverrides> {
  const stored = await AsyncStorage.getItem(DEMO_ADMIN_KEY);
  if (!stored) return emptyDemoAdminOverrides();
  try {
    const parsed = JSON.parse(stored);
    return {
      providerStatuses: parsed?.providerStatuses && typeof parsed.providerStatuses === 'object' ? parsed.providerStatuses : {},
      serviceCategoryActive: parsed?.serviceCategoryActive && typeof parsed.serviceCategoryActive === 'object' ? parsed.serviceCategoryActive : {},
      promotionActive: parsed?.promotionActive && typeof parsed.promotionActive === 'object' ? parsed.promotionActive : {},
      serviceCategories: Array.isArray(parsed?.serviceCategories) ? parsed.serviceCategories : undefined,
      promotions: Array.isArray(parsed?.promotions) ? parsed.promotions : undefined,
    };
  } catch {
    return emptyDemoAdminOverrides();
  }
}

function queueDemoAdminUpdate(update: (current: DemoAdminOverrides) => DemoAdminOverrides): Promise<void> {
  const operation = demoAdminWriteQueue.then(async () => {
    const next = update(await loadDemoAdminOverrides());
    await AsyncStorage.setItem(DEMO_ADMIN_KEY, JSON.stringify(next));
  });
  demoAdminWriteQueue = operation.catch(() => undefined);
  return operation;
}

function saveDemoAdminOverride<K extends 'providerStatuses' | 'serviceCategoryActive' | 'promotionActive'>(key: K, id: string, value: DemoAdminOverrides[K][string]): Promise<void> {
  return queueDemoAdminUpdate((current) => ({ ...current, [key]: { ...current[key], [id]: value } }));
}

function saveDemoAdminData(update: (current: DemoAdminOverrides) => DemoAdminOverrides): Promise<void> { return queueDemoAdminUpdate(update); }

async function readDemoBookings(): Promise<Booking[]> {
  const stored = await AsyncStorage.getItem(DEMO_BOOKINGS_KEY);
  if (!stored) {
    await AsyncStorage.setItem(DEMO_BOOKINGS_KEY, JSON.stringify(demoBookings));
    return demoBookings;
  }
  try { return JSON.parse(stored) as Booking[]; } catch { return demoBookings; }
}
async function saveDemoBookings(bookings: Booking[]) { await AsyncStorage.setItem(DEMO_BOOKINGS_KEY, JSON.stringify(bookings)); }

type CatalogLookups = {
  categories: Map<string, { titleEn: string; titleUr: string }>;
  subtypes: Map<string, { titleEn: string; titleUr: string }>;
};

async function loadCatalogLookups(): Promise<CatalogLookups> {
  if (!supabase) throw new Error('Supabase is unavailable.');
  const [categoryResult, subtypeResult] = await Promise.all([
    supabase.from('service_categories').select('id, name_en, name_ur').limit(1000),
    supabase.from('service_subtypes').select('id, name_en, name_ur').limit(2000),
  ]);
  if (categoryResult.error) throw categoryResult.error;
  if (subtypeResult.error) throw subtypeResult.error;
  return {
    categories: new Map((categoryResult.data ?? []).map((row) => [row.id, { titleEn: row.name_en, titleUr: row.name_ur }])),
    subtypes: new Map((subtypeResult.data ?? []).map((row) => [row.id, { titleEn: row.name_en, titleUr: row.name_ur }])),
  };
}

function mapDbBooking(row: any, lookups?: CatalogLookups): Booking {
  const category = categories.find((item) => item.id === row.service_category_id);
  const subtype = category?.subtypes.find((item) => item.id === row.subtype_id);
  const liveCategory = lookups?.categories.get(row.service_category_id);
  const liveSubtype = lookups?.subtypes.get(row.subtype_id);
  return {
    id: row.id,
    serviceId: row.service_category_id,
    serviceNameUr: liveCategory?.titleUr ?? category?.titleUr ?? row.service_category_id,
    serviceNameEn: liveCategory?.titleEn ?? category?.titleEn ?? row.service_category_id,
    subtypeUr: liveSubtype?.titleUr ?? subtype?.titleUr ?? row.subtype_id,
    subtypeEn: liveSubtype?.titleEn ?? subtype?.titleEn ?? row.subtype_id,
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
    const lookups = await loadCatalogLookups();
    if (draft.photoUri) {
      try {
        const photoPath = await uploadPhoto(draft.photoUri, user.id, row.id);
        const { data: attached, error: attachError } = await supabase.rpc('customer_attach_booking_photo', { p_booking_id: row.id, p_photo_path: photoPath });
        if (attachError) throw attachError;
        row = attached;
      } catch {
        return { ...mapDbBooking(row, lookups), photoUploadFailed: true };
      }
    }
    return mapDbBooking(row, lookups);
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
    const [bookingsResult, lookups] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(user.role === 'admin' ? 1000 : 100),
      loadCatalogLookups(),
    ]);
    if (bookingsResult.error) throw bookingsResult.error;
    const { data: ratings, error: ratingsError } = user.role === 'customer'
      ? await supabase.from('reviews').select('booking_id, rating').eq('customer_id', user.id).limit(100)
      : { data: [], error: null };
    if (ratingsError) throw ratingsError;
    return (bookingsResult.data ?? []).map((row) => ({ ...mapDbBooking(row, lookups), rating: ratings?.find((review) => review.booking_id === row.id)?.rating }));
  }
  return readDemoBookings();
}

export async function listProviderOpenJobs(user: AppUser | null, mode: SessionMode): Promise<Booking[]> {
  if (mode !== 'authenticated' || !user || user.role !== 'provider' || !supabase) return [];
  const [jobsResult, lookups] = await Promise.all([supabase.rpc('provider_list_open_jobs'), loadCatalogLookups()]);
  if (jobsResult.error) throw jobsResult.error;
  const { data } = jobsResult;
  return (data ?? []).map((row: any) => {
    const category = categories.find((item) => item.id === row.service_category_id);
    const subtype = category?.subtypes.find((item) => item.id === row.subtype_id);
    const liveCategory = lookups.categories.get(row.service_category_id);
    const liveSubtype = lookups.subtypes.get(row.subtype_id);
    return {
      id: row.id,
      serviceId: row.service_category_id,
      serviceNameUr: liveCategory?.titleUr ?? category?.titleUr ?? row.service_category_id,
      serviceNameEn: liveCategory?.titleEn ?? category?.titleEn ?? row.service_category_id,
      subtypeUr: liveSubtype?.titleUr ?? subtype?.titleUr ?? row.subtype_id,
      subtypeEn: liveSubtype?.titleEn ?? subtype?.titleEn ?? row.subtype_id,
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
      return mapDbBooking(data, await loadCatalogLookups());
    }
    if (user.role === 'customer' && next === 'cancelled') {
      const { data, error } = await supabase.rpc('customer_cancel_booking', { p_booking_id: booking.id });
      if (error) throw error;
      return mapDbBooking(data, await loadCatalogLookups());
    }
    throw new Error('This role cannot change the booking status.');
  }
  const rows = await readDemoBookings();
  const updated = rows.map((item) => item.id === booking.id ? { ...item, status: next } : item);
  await saveDemoBookings(updated);
  return updated.find((item) => item.id === booking.id) ?? booking;
}

export async function assignBookingProvider(booking: Booking, provider: AdminProviderRecord, mode: SessionMode): Promise<Booking> {
  if (mode === 'authenticated' && supabase) {
    const { data, error } = await supabase.rpc('admin_assign_booking_provider', { p_booking_id: booking.id, p_provider_id: provider.id });
    if (error) throw error;
    return mapDbBooking(data, await loadCatalogLookups());
  }
  if (mode !== 'demo') throw new Error('A protected admin session is required.');
  const updated = { ...booking, providerId: provider.id, providerName: provider.name, status: 'accepted' as const };
  const rows = await readDemoBookings();
  await saveDemoBookings(rows.map((item) => item.id === booking.id ? updated : item));
  return updated;
}

export interface AdminCustomerRecord {
  id: string;
  displayName: string;
  phone: string;
  createdAt: string;
  bookingsCount: number;
}

const DEMO_CUSTOMERS: AdminCustomerRecord[] = [
  { id: 'demo-customer-01', displayName: 'Ali Raza', phone: '+92 ••• ••• 1042', createdAt: '2026-10-28T08:30:00.000Z', bookingsCount: 3 },
  { id: 'demo-customer-02', displayName: 'Hina Malik', phone: '+92 ••• ••• 2871', createdAt: '2026-10-19T11:10:00.000Z', bookingsCount: 1 },
  { id: 'demo-customer-03', displayName: 'Usman Ahmed', phone: '+92 ••• ••• 5906', createdAt: '2026-09-30T15:45:00.000Z', bookingsCount: 5 },
];

export async function loadAdminCustomers(search: string, offset = 0, limit = 100, mode: SessionMode = 'authenticated'): Promise<{ customers: AdminCustomerRecord[]; totalCount: number }> {
  const needle = search.trim().toLowerCase();
  if (mode === 'demo') {
    const customers = DEMO_CUSTOMERS.filter((row) => `${row.displayName} ${row.phone} ${row.id}`.toLowerCase().includes(needle));
    return { customers: customers.slice(offset, offset + limit), totalCount: customers.length };
  }
  if (!supabase) throw new Error('Supabase is unavailable.');
  const { data, error } = await supabase.rpc('admin_list_customers', { p_search: search.trim(), p_limit: limit, p_offset: offset });
  if (error) throw error;
  return {
    customers: (data ?? []).map((row: any) => ({ id: row.id, displayName: row.display_name || '', phone: row.phone ?? '', createdAt: row.created_at, bookingsCount: Number(row.bookings_count ?? 0) })),
    totalCount: Number(data?.[0]?.total_count ?? 0),
  };
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

export async function saveServiceCategory(category: ServiceCategory, isUpdate: boolean, mode: SessionMode): Promise<ServiceCategory> {
  if (mode === 'demo') {
    await saveDemoAdminData((current) => {
      const rows = current.serviceCategories ?? categories;
      const saved = rows.some((row) => row.id === category.id)
        ? rows.map((row) => row.id === category.id ? category : row)
        : [...rows, category];
      return { ...current, serviceCategories: saved, serviceCategoryActive: { ...current.serviceCategoryActive, [category.id]: category.available } };
    });
    return category;
  }
  if (!supabase) throw new Error('Supabase is unavailable.');
  const { data, error } = await supabase.rpc('admin_save_service_category', {
    p_id: category.id, p_name_en: category.titleEn, p_name_ur: category.titleUr, p_icon: category.icon,
    p_is_active: category.available, p_sort_order: category.sortOrder ?? 0, p_is_update: isUpdate,
  });
  if (error) throw error;
  return { ...category, id: data.id, titleEn: data.name_en, titleUr: data.name_ur, icon: data.icon, available: data.is_active, sortOrder: data.sort_order };
}

export async function saveServiceSubtype(categoryId: string, subtype: ServiceSubtype, active: boolean, sortOrder: number, isUpdate: boolean, mode: SessionMode): Promise<ServiceSubtype> {
  if (mode === 'demo') {
    const saved = { ...subtype, available: active, sortOrder };
    await saveDemoAdminData((current) => {
      const rows = current.serviceCategories ?? categories;
      const next = rows.map((category) => category.id !== categoryId ? category : {
        ...category,
        subtypes: category.subtypes.some((item) => item.id === subtype.id)
          ? category.subtypes.map((item) => item.id === subtype.id ? saved : item)
          : [...category.subtypes, saved],
      });
      return { ...current, serviceCategories: next };
    });
    return saved;
  }
  if (!supabase) throw new Error('Supabase is unavailable.');
  const { data, error } = await supabase.rpc('admin_save_service_subtype', {
    p_id: subtype.id, p_category_id: categoryId, p_name_en: subtype.titleEn, p_name_ur: subtype.titleUr,
    p_starting_price_pkr: subtype.startingPrice, p_is_active: active, p_sort_order: sortOrder, p_is_update: isUpdate,
  });
  if (error) throw error;
  return { id: data.id, titleEn: data.name_en, titleUr: data.name_ur, startingPrice: data.starting_price_pkr, available: data.is_active, sortOrder: data.sort_order };
}

export async function setSubtypeActive(subtypeId: string, active: boolean, mode: SessionMode): Promise<void> {
  if (mode === 'demo') {
    await saveDemoAdminData((current) => ({
      ...current,
      serviceCategories: (current.serviceCategories ?? categories).map((category) => ({
        ...category,
        subtypes: category.subtypes.map((subtype) => subtype.id === subtypeId ? { ...subtype, available: active } : subtype),
      })),
    }));
    return;
  }
  if (!supabase) throw new Error('Supabase is unavailable.');
  const { error } = await supabase.rpc('admin_set_subtype_active', { p_subtype_id: subtypeId, p_is_active: active });
  if (error) throw error;
}

export async function savePromotion(promotion: AdminPromotion, isUpdate: boolean, mode: SessionMode): Promise<AdminPromotion> {
  if (mode === 'demo') {
    await saveDemoAdminData((current) => {
      const rows = current.promotions ?? [{ code: 'PEHLI15', titleEn: 'First booking discount', titleUr: 'پہلی بکنگ پر رعایت', discountPercent: 15, active: true, expiresAt: null, usageLimit: null }];
      const saved = rows.some((row) => row.code === promotion.code)
        ? rows.map((row) => row.code === promotion.code ? promotion : row)
        : [...rows, promotion];
      return { ...current, promotions: saved, promotionActive: { ...current.promotionActive, [promotion.code]: promotion.active } };
    });
    return promotion;
  }
  if (!supabase) throw new Error('Supabase is unavailable.');
  const { data, error } = await supabase.rpc('admin_save_promo', {
    p_code: promotion.code, p_title_en: promotion.titleEn, p_title_ur: promotion.titleUr,
    p_discount_percent: promotion.discountPercent, p_active: promotion.active,
    p_expires_at: promotion.expiresAt, p_usage_limit: promotion.usageLimit, p_is_update: isUpdate,
  });
  if (error) throw error;
  return { code: data.code, titleEn: data.title_en, titleUr: data.title_ur, discountPercent: data.discount_percent, active: data.active, expiresAt: data.expires_at, usageLimit: data.usage_limit };
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

export async function loadAdminProviderPage(search: string, status: AdminProviderRecord['status'] | 'all', offset = 0, limit = 100, categoryId: string | null = null): Promise<{ providers: AdminProviderRecord[]; totalCount: number }> {
  if (!supabase) throw new Error('Supabase is unavailable.');
  const { data, error } = await supabase.rpc('admin_list_providers', { p_search: search.trim(), p_status: status, p_category_id: categoryId, p_limit: limit, p_offset: offset });
  if (error) throw error;
  return {
    providers: (data ?? []).map((row: any) => ({
      id: row.id, name: row.full_name ?? '', phone: row.phone ?? '', serviceArea: row.service_area ?? '', categoryIds: row.category_ids ?? [],
      yearsExperience: Number(row.years_experience ?? 0), status: row.verification_status,
      rating: Number(row.rating ?? 0), reviews: Number(row.review_count ?? 0), completedJobs: Number(row.completed_jobs ?? 0), createdAt: row.created_at,
    })),
    totalCount: Number(data?.[0]?.total_count ?? 0),
  };
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
    supabase.from('providers').select('id, full_name, phone, service_area, service_category_ids, years_experience, verification_status, rating, review_count, completed_jobs, created_at').order('created_at', { ascending: false }).limit(100),
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
      sortOrder: row.sort_order,
      subtypes: (subtypeResult.data ?? []).filter((subtype) => subtype.category_id === row.id).map((subtype) => ({
        id: subtype.id,
        titleEn: subtype.name_en,
        titleUr: subtype.name_ur,
        startingPrice: subtype.starting_price_pkr,
        available: subtype.is_active,
        sortOrder: subtype.sort_order,
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
