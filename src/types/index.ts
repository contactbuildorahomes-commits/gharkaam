export type Language = 'ur' | 'en';
export type UserRole = 'customer' | 'provider' | 'admin';
export type SessionMode = 'demo' | 'authenticated';
export type BookingStatus = 'pending' | 'accepted' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'wallet_demo' | 'bank_demo';
export type AppRoute = 'home' | 'booking' | 'bookings' | 'tracking' | 'profile' | 'provider' | 'admin';

export interface ServiceCategory {
  id: string;
  icon: string;
  titleUr: string;
  titleEn: string;
  color: string;
  subtypes: ServiceSubtype[];
  available: boolean;
}

export interface ServiceSubtype {
  id: string;
  titleUr: string;
  titleEn: string;
  startingPrice: number;
}

export interface Provider {
  id: string;
  nameUr: string;
  nameEn: string;
  tradeUr: string;
  tradeEn: string;
  rating: number;
  reviews: number;
  completedJobs: number;
  startingPrice: number;
  eta: string;
  verified: boolean;
  specialty: string;
  status?: 'pending' | 'approved' | 'suspended';
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceNameUr: string;
  serviceNameEn: string;
  subtypeUr: string;
  subtypeEn: string;
  providerId?: string | null;
  providerName: string;
  preferredProviderName?: string;
  customerName: string;
  description: string;
  address: string;
  scheduledAt: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  price: number;
  rating?: number;
  photoUri?: string;
  photoUploadFailed?: boolean;
  createdAt: string;
}

export interface BookingDraft {
  serviceId: string;
  subtypeId: string;
  description: string;
  photoUri?: string;
  address: string;
  scheduledAt: string;
  provider: Provider;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  price: number;
}

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  providerStatus?: 'pending' | 'approved' | 'suspended';
}
