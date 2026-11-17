const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const projectRoot = path.resolve(__dirname, '..');

function loadTypeScript(relativePath) {
  const sourcePath = path.join(projectRoot, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = new Module(sourcePath, module);
  loaded.filename = sourcePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  loaded._compile(compiled, sourcePath);
  return loaded.exports;
}

const demoState = loadTypeScript('src/lib/demoState.ts');
const translations = loadTypeScript('src/i18n/translations.ts');

const electrician = {
  id: 'electrician', titleEn: 'Electrician', titleUr: 'الیکٹریشن', icon: 'flash', color: '#eee', available: true,
  subtypes: [{ id: 'fan', titleEn: 'Fan', titleUr: 'پنکھا', startingPrice: 1000 }],
};
const plumber = {
  id: 'plumber', titleEn: 'Plumber', titleUr: 'پلمبر', icon: 'water', color: '#eef', available: true,
  subtypes: [{ id: 'leak', titleEn: 'Leak', titleUr: 'لیک', startingPrice: 800 }],
};
const booking = (values = {}) => ({
  id: 'GK-9001', serviceId: 'electrician', serviceNameUr: 'الیکٹریشن', serviceNameEn: 'Electrician', subtypeUr: 'پنکھا', subtypeEn: 'Fan',
  providerId: null, providerName: '', customerName: 'Ahmad', description: 'Fan issue', address: 'Gulberg, Lahore', scheduledAt: '2026-12-01T12:00:00.000Z',
  status: 'pending', paymentMethod: 'cash', price: 1000, createdAt: '2026-11-17T08:00:00.000Z', ...values,
});

test('admin category pause and reactivation resolve to the customer-visible catalog', () => {
  const paused = demoState.applyDemoCategoryOverrides([electrician, plumber], { serviceCategoryActive: { electrician: false } });
  assert.equal(paused.find((item) => item.id === 'electrician').available, false);
  assert.deepEqual(paused.filter((item) => item.available).map((item) => item.id), ['plumber']);
  const reactivated = demoState.applyDemoCategoryOverrides(paused, { serviceCategoryActive: { electrician: true } });
  assert.deepEqual(reactivated.filter((item) => item.available).map((item) => item.id), ['electrician', 'plumber']);
});

test('demo provider view uses eligible shared requests and hides closed or unrelated bookings', () => {
  const visible = demoState.getDemoProviderBookings([
    booking(),
    booking({ id: 'GK-9002', serviceId: 'plumber' }),
    booking({ id: 'GK-9003', providerId: 'pro-02', status: 'accepted' }),
    booking({ id: 'GK-9004', providerId: 'pro-01', status: 'accepted' }),
    booking({ id: 'GK-9005', status: 'completed' }),
    booking({ id: 'GK-9006', status: 'cancelled' }),
  ], 'pro-01', ['electrician']);
  assert.deepEqual(visible.map((item) => item.id), ['GK-9001', 'GK-9004']);
});

test('provider acceptance is the point a demo request becomes assigned', () => {
  const request = booking({ preferredProviderName: 'Muhammad Usman' });
  const pending = demoState.applyDemoProviderStatus(request, 'pending', { id: 'pro-01', nameEn: 'Muhammad Usman', nameUr: 'محمد عثمان' }, 'en');
  assert.equal(pending.providerId, null);
  const accepted = demoState.applyDemoProviderStatus(request, 'accepted', { id: 'pro-01', nameEn: 'Muhammad Usman', nameUr: 'محمد عثمان' }, 'en');
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.providerId, 'pro-01');
  assert.equal(accepted.providerName, 'Muhammad Usman');
  assert.equal(accepted.demoAssignmentConfirmed, true);
  assert.equal(demoState.normalizeLegacyDemoBookings([accepted])[0].status, 'accepted');
});

test('old local demo bookings created from mock selections are converted to pending preferences', () => {
  const oldBooking = booking({ id: 'GK-OLD-ABC', providerId: 'pro-01', providerName: 'Muhammad Usman', preferredProviderName: 'Muhammad Usman', status: 'accepted' });
  const [migrated] = demoState.normalizeLegacyDemoBookings([oldBooking]);
  assert.equal(migrated.status, 'pending');
  assert.equal(migrated.providerId, null);
  assert.equal(migrated.providerName, '');
  assert.equal(migrated.preferredProviderName, 'Muhammad Usman');
  const seed = booking({ id: 'GK-2048', providerId: 'pro-02', providerName: 'Ali Raza', status: 'accepted' });
  assert.equal(demoState.normalizeLegacyDemoBookings([seed])[0].providerId, 'pro-02');
});

test('demo promo override defaults to available but respects pause and expiry', () => {
  assert.equal(demoState.isDemoPromoAvailable({}), true);
  assert.equal(demoState.isDemoPromoAvailable({ promotionActive: { PEHLI15: false } }), false);
  assert.equal(demoState.isDemoPromoAvailable({ promotions: [{ code: 'PEHLI15', active: true, expiresAt: '2026-01-01T00:00:00.000Z' }] }, Date.parse('2026-11-17T00:00:00.000Z')), false);
});

test('request, provider preference, and COD-only copy exists in both languages', () => {
  for (const key of ['confirmBooking', 'pending', 'providerPreference', 'demoProviderPreferences', 'providerAssignmentHint', 'cashOnlyNotice', 'demoLabel']) {
    assert.equal(typeof translations.text('en', key), 'string');
    assert.notEqual(translations.text('en', key), key);
    assert.notEqual(translations.text('ur', key), key);
  }
  assert.match(translations.text('en', 'confirmBooking'), /request/i);
  assert.match(translations.text('en', 'cash'), /cash after service/i);
});

test('booking UI exposes COD only and distinguishes authenticated assignment from demo preference', () => {
  const screen = fs.readFileSync(path.join(projectRoot, 'src/screens/BookingFlowScreen.tsx'), 'utf8');
  const types = fs.readFileSync(path.join(projectRoot, 'src/types/index.ts'), 'utf8');
  assert.match(types, /export type PaymentMethod = 'cash'/);
  assert.doesNotMatch(screen, /wallet_demo|bank_demo|wallet-outline|business-outline/);
  assert.match(screen, /mode === 'demo' \? 'demoProviderPreferences' : 'providerAssignment'/);
  assert.match(screen, /cashOnlyNotice/);
});

test('authenticated repository paths require Supabase and cannot fall through to demo persistence', () => {
  const repository = fs.readFileSync(path.join(projectRoot, 'src/data/repository.ts'), 'utf8');
  const createBooking = repository.slice(repository.indexOf('export async function createBooking'), repository.indexOf('export async function listBookings'));
  const listBookings = repository.slice(repository.indexOf('export async function listBookings'), repository.indexOf('export async function listProviderOpenJobs'));
  const setBookingStatus = repository.slice(repository.indexOf('export async function setBookingStatus'), repository.indexOf('export async function assignBookingProvider'));
  const saveRating = repository.slice(repository.indexOf('export async function saveRating'), repository.indexOf('export async function setProviderApproval'));
  for (const block of [createBooking, listBookings, setBookingStatus, saveRating]) {
    assert.match(block, /if \(mode === 'authenticated'\)/);
    assert.match(block, /if \(!user \|\| !supabase\) throw new Error/);
  }
  assert.ok(createBooking.indexOf("if (mode !== 'demo') throw") < createBooking.indexOf('const booking: Booking ='));
  assert.ok(setBookingStatus.indexOf("if (mode !== 'demo') throw") < setBookingStatus.indexOf('const rows = await readDemoBookings()'));
});
