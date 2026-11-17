import type { Booking, Provider, ServiceCategory } from '../types';
import { colors } from '../theme/tokens';

export const categories: ServiceCategory[] = [
  { id: 'electrician', icon: 'flash', titleUr: 'الیکٹریشن', titleEn: 'Electrician', color: colors.orangeSoft, available: true, subtypes: [
    { id: 'switch-socket', titleUr: 'سوئچ اور ساکٹ', titleEn: 'Switch or socket', startingPrice: 700 },
    { id: 'wiring', titleUr: 'وائرنگ کا مسئلہ', titleEn: 'Wiring issue', startingPrice: 1200 },
    { id: 'light-fan', titleUr: 'لائٹ یا پنکھا', titleEn: 'Light or fan', startingPrice: 800 },
    { id: 'breaker', titleUr: 'سرکٹ بریکر', titleEn: 'Circuit breaker', startingPrice: 1000 },
  ] },
  { id: 'plumber', icon: 'water', titleUr: 'پلمبر', titleEn: 'Plumber', color: colors.blueSoft, available: true, subtypes: [
    { id: 'leak', titleUr: 'نل یا پائپ لیک', titleEn: 'Leaking tap or pipe', startingPrice: 800 },
    { id: 'drain', titleUr: 'ڈرین بند', titleEn: 'Blocked drain', startingPrice: 1000 },
    { id: 'basin-toilet', titleUr: 'واش بیسن / ٹوائلٹ', titleEn: 'Basin or toilet', startingPrice: 1200 },
    { id: 'water-motor', titleUr: 'واٹر موٹر', titleEn: 'Water motor', startingPrice: 1500 },
  ] },
  { id: 'appliance', icon: 'construct', titleUr: 'اپلائنس مرمت', titleEn: 'Appliance repair', color: colors.mint, available: false, subtypes: [] },
  { id: 'ac', icon: 'snow', titleUr: 'اے سی سروس', titleEn: 'AC service', color: '#EAF5F8', available: false, subtypes: [] },
];

export const providers: Provider[] = [
  { id: 'pro-01', nameUr: 'محمد عثمان', nameEn: 'Muhammad Usman', tradeUr: 'الیکٹریشن', tradeEn: 'Electrician', rating: 4.9, reviews: 186, completedJobs: 342, startingPrice: 700, eta: '25 min', verified: true, specialty: 'Residential wiring' },
  { id: 'pro-02', nameUr: 'علی رضا', nameEn: 'Ali Raza', tradeUr: 'پلمبر', tradeEn: 'Plumber', rating: 4.8, reviews: 142, completedJobs: 278, startingPrice: 800, eta: '35 min', verified: true, specialty: 'Leak & pipe repair' },
  { id: 'pro-03', nameUr: 'بلال احمد', nameEn: 'Bilal Ahmed', tradeUr: 'الیکٹریشن', tradeEn: 'Electrician', rating: 4.7, reviews: 98, completedJobs: 201, startingPrice: 650, eta: '40 min', verified: true, specialty: 'Fans & lighting' },
  { id: 'pro-04', nameUr: 'عمران صدیقی', nameEn: 'Imran Siddiqui', tradeUr: 'پلمبر', tradeEn: 'Plumber', rating: 4.9, reviews: 221, completedJobs: 419, startingPrice: 900, eta: '30 min', verified: true, specialty: 'Bathroom fittings' },
];

export const demoBookings: Booking[] = [
  { id: 'GK-2048', serviceId: 'plumber', serviceNameUr: 'پلمبر', serviceNameEn: 'Plumber', subtypeUr: 'نل یا پائپ لیک', subtypeEn: 'Leaking tap or pipe', providerId: 'pro-02', providerName: 'علی رضا', customerName: 'احمد خان', description: 'کچن کا نل ٹپک رہا ہے', address: 'ماڈل ٹاؤن، لاہور', scheduledAt: new Date(Date.now() + 45 * 60000).toISOString(), status: 'accepted', paymentMethod: 'cash', price: 1200, createdAt: new Date().toISOString() },
  { id: 'GK-1936', serviceId: 'electrician', serviceNameUr: 'الیکٹریشن', serviceNameEn: 'Electrician', subtypeUr: 'لائٹ یا پنکھا', subtypeEn: 'Light or fan', providerId: 'pro-01', providerName: 'محمد عثمان', customerName: 'احمد خان', description: 'بیڈ روم کا پنکھا چل نہیں رہا', address: 'گلبرگ، لاہور', scheduledAt: new Date(Date.now() - 86400000).toISOString(), status: 'completed', paymentMethod: 'cash', price: 1000, rating: 5, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'GK-2083', serviceId: 'electrician', serviceNameUr: 'الیکٹریشن', serviceNameEn: 'Electrician', subtypeUr: 'لائٹ یا پنکھا', subtypeEn: 'Light or fan', providerId: null, providerName: '', customerName: 'احمد خان', description: 'بیڈ روم کا پنکھا آواز کر رہا ہے۔', address: 'گلبرگ III، لاہور', scheduledAt: new Date(Date.now() + 3 * 3600000).toISOString(), status: 'pending', paymentMethod: 'cash', price: 1000, createdAt: new Date().toISOString() },
];

export const providerApplications: Provider[] = [
  { id: 'app-01', nameUr: 'حسن محمود', nameEn: 'Hassan Mahmood', tradeUr: 'الیکٹریشن', tradeEn: 'Electrician', rating: 0, reviews: 0, completedJobs: 0, startingPrice: 0, eta: '—', verified: false, specialty: 'ID and trade certificate submitted', status: 'pending' },
  { id: 'app-02', nameUr: 'شاہد اقبال', nameEn: 'Shahid Iqbal', tradeUr: 'پلمبر', tradeEn: 'Plumber', rating: 0, reviews: 0, completedJobs: 0, startingPrice: 0, eta: '—', verified: false, specialty: 'ID and trade certificate submitted', status: 'pending' },
];
