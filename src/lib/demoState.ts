import type { Booking, BookingStatus, Provider, ServiceCategory } from '../types';

type DemoCatalogOverrides = {
  serviceCategoryActive?: Record<string, boolean>;
  promotions?: { code: string; active: boolean; expiresAt: string | null }[];
  promotionActive?: Record<string, boolean>;
  serviceCategories?: ServiceCategory[];
};

export function applyDemoCategoryOverrides(base: ServiceCategory[], overrides: DemoCatalogOverrides): ServiceCategory[] {
  return (overrides.serviceCategories ?? base).map((category) => ({
    ...category,
    available: overrides.serviceCategoryActive?.[category.id] ?? category.available,
    subtypes: category.subtypes.map((subtype) => ({ ...subtype, available: subtype.available ?? true })),
  }));
}

export function isDemoPromoAvailable(overrides: DemoCatalogOverrides, now = Date.now()): boolean {
  const promo = (overrides.promotions ?? []).find((item) => item.code === 'PEHLI15');
  const active = overrides.promotionActive?.PEHLI15 ?? promo?.active ?? true;
  return Boolean(active && (!promo?.expiresAt || new Date(promo.expiresAt).getTime() > now));
}

export function getDemoProviderBookings(bookings: Booking[], providerId: string, serviceIds: string[]): Booking[] {
  return bookings.filter((booking) => {
    if (booking.status === 'completed' || booking.status === 'cancelled') return false;
    if (booking.providerId === providerId) return true;
    return !booking.providerId && booking.status === 'pending' && serviceIds.includes(booking.serviceId);
  });
}

export function applyDemoProviderStatus(
  booking: Booking,
  status: BookingStatus,
  provider?: Pick<Provider, 'id' | 'nameEn' | 'nameUr'>,
  language: 'ur' | 'en' = 'ur',
): Booking {
  const newlyAccepted = status === 'accepted' && !booking.providerId && provider;
  return {
    ...booking,
    status,
    ...(newlyAccepted ? { providerId: provider.id, providerName: language === 'ur' ? provider.nameUr : provider.nameEn, demoAssignmentConfirmed: true } : {}),
  };
}

const DEMO_SEED_IDS = new Set(['GK-2048', 'GK-1936', 'GK-2083']);

export function normalizeLegacyDemoBookings(bookings: Booking[]): Booking[] {
  return bookings.map((booking) => {
    const wasOldMockAssignment = !DEMO_SEED_IDS.has(booking.id)
      && typeof booking.providerId === 'string'
      && booking.providerId.startsWith('pro-')
      && booking.status === 'accepted'
      && booking.demoAssignmentConfirmed !== true;
    if (!wasOldMockAssignment) return booking;
    return {
      ...booking,
      providerId: null,
      providerName: '',
      preferredProviderName: booking.preferredProviderName || booking.providerName,
      status: 'pending',
    };
  });
}
