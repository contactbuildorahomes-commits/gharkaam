const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(projectRoot, 'src/lib/adminValidation.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const validationModule = new Module(sourcePath, module);
validationModule.filename = sourcePath;
validationModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
validationModule._compile(compiled, sourcePath);
const { normalizeServiceId, normalizePromoCode, validateCategoryDraft, validateSubtypeDraft, validatePromotionDraft, hasValidationErrors } = validationModule.exports;

test('normalizes service IDs and offer codes without accepting unsafe punctuation', () => {
  assert.equal(normalizeServiceId('  AC & Repair / Home '), 'ac-repair-home');
  assert.equal(normalizePromoCode(' pehli-15 '), 'PEHLI-15');
});

test('requires both Urdu and English category names and a stable service ID', () => {
  assert.deepEqual(validateCategoryDraft({ id: 'new-service', titleEn: 'Home repair', titleUr: 'گھر کی مرمت', icon: 'construct' }), {});
  const errors = validateCategoryDraft({ id: '!!', titleEn: '', titleUr: '   ', icon: '' });
  assert.equal(errors.id, 'required');
  assert.equal(errors.titleEn, 'required');
  assert.equal(errors.titleUr, 'required');
  assert.equal(errors.icon, 'required');
  assert.equal(hasValidationErrors(errors), true);
  assert.equal(validateCategoryDraft({ id: 'valid-id', titleEn: 'Repair', titleUr: 'مرمت', icon: 'x'.repeat(41) }).icon, 'icon_too_long');
});

test('validates subtype prices as non-negative whole rupees', () => {
  assert.deepEqual(validateSubtypeDraft({ id: 'water-motor', titleEn: 'Water motor', titleUr: 'واٹر موٹر', price: '1500' }), {});
  assert.equal(validateSubtypeDraft({ id: 'valid', titleEn: 'Fix', titleUr: 'مرمت', price: '-1' }).price, 'invalid_price');
  assert.equal(validateSubtypeDraft({ id: 'valid', titleEn: 'Fix', titleUr: 'مرمت', price: '9.5' }).price, 'invalid_price');
});

test('validates offer code, discount, date, and usage limit', () => {
  assert.deepEqual(validatePromotionDraft({ code: ' PEHLI15 ', titleEn: 'First booking', titleUr: 'پہلی بکنگ', discountPercent: '15', expiresOn: '', usageLimit: '' }), {});
  const errors = validatePromotionDraft({ code: 'bad code!', titleEn: '', titleUr: '', discountPercent: '101', expiresOn: '2026-02-30', usageLimit: '0' });
  assert.equal(errors.code, 'invalid_code');
  assert.equal(errors.titleEn, 'required');
  assert.equal(errors.titleUr, 'required');
  assert.equal(errors.discountPercent, 'invalid_discount');
  assert.equal(errors.expiresOn, 'invalid_date');
  assert.equal(errors.usageLimit, 'invalid_limit');
});

test('new admin RPCs explicitly guard the admin role and are not granted to anon', () => {
  const migration = fs.readFileSync(path.join(projectRoot, 'database/migrations/202611150003_admin_v1_controls.sql'), 'utf8');
  for (const functionName of ['admin_list_customers', 'admin_assign_booking_provider', 'admin_save_service_category', 'admin_save_service_subtype', 'admin_set_subtype_active', 'admin_save_promo']) {
    const definition = migration.slice(migration.indexOf(`function public.${functionName}`));
    assert.match(definition, /current_app_role\(\) is distinct from 'admin'/, `${functionName} needs a server-side admin guard`);
    assert.match(definition, new RegExp(`revoke all on function public\\.${functionName}\\([^;]+ from public, anon;`), `${functionName} must not be callable by anon`);
  }
});

test('catalog tables are RPC-only for client roles and promo limits count booking creation', () => {
  const migration = fs.readFileSync(path.join(projectRoot, 'database/migrations/202611150003_admin_v1_controls.sql'), 'utf8');
  assert.match(migration, /revoke insert, update, delete on public\.service_categories, public\.service_subtypes, public\.promo_codes from public, anon, authenticated;/);
  assert.match(migration, /Policy: every booking created with an offer consumes one use, including bookings later cancelled\./);
  assert.match(migration, /usage_limit < v_usage_count/);
  const bookingRpc = migration.slice(migration.indexOf('create or replace function public.customer_create_booking'));
  assert.match(bookingRpc, /for update;/, 'promo-row lock serializes concurrent capped bookings');
  assert.match(bookingRpc, /select count\(\*\) into v_usage_count from public\.bookings where promo_code = v_promo;/);
  assert.doesNotMatch(migration, /\b(?:drop table|truncate|delete from)\b/i, 'the V1 migration must remain non-destructive');
});

test('provider search and assignment paging are admin-guarded and bounded', () => {
  const migration = fs.readFileSync(path.join(projectRoot, 'database/migrations/202611150004_admin_provider_paging.sql'), 'utf8');
  assert.match(migration, /current_app_role\(\) is distinct from 'admin'/);
  assert.match(migration, /revoke all on function public\.admin_list_providers\(text, text, text, integer, integer\) from public, anon;/);
  assert.match(migration, /grant execute on function public\.admin_list_providers\(text, text, text, integer, integer\) to authenticated;/);
  assert.match(migration, /p_category_id = any\(p\.service_category_ids\)/);
  assert.match(migration, /limit least\(greatest\(coalesce\(p_limit, 100\), 1\), 100\)/);
  assert.match(migration, /offset greatest\(coalesce\(p_offset, 0\), 0\)/);
  assert.doesNotMatch(migration, /\b(?:drop table|truncate|delete from)\b/i);
});

test('legacy SECURITY DEFINER functions use fixed search paths and explicit RPC grants', () => {
  const migration = fs.readFileSync(path.join(projectRoot, 'database/migrations/202611150005_harden_legacy_rpc_paths.sql'), 'utf8');
  const functions = [
    'current_app_role()', 'handle_new_auth_user()', 'record_booking_status_event()', 'provider_set_booking_status(uuid, text)',
    'customer_cancel_booking(uuid)', 'customer_attach_booking_photo(uuid, text)', 'admin_set_provider_status(uuid, text)',
    'admin_set_category_active(text, boolean)', 'admin_set_promo_active(text, boolean)', 'admin_set_booking_status(uuid, text)', 'provider_list_open_jobs()',
  ];
  for (const signature of functions) assert.ok(migration.includes(`alter function public.${signature} set search_path = pg_catalog, public;`), `${signature} must have a pinned search path`);
  assert.match(migration, /revoke all on function public\.admin_set_booking_status\(uuid, text\) from public, anon;/);
  assert.match(migration, /grant execute on function public\.admin_set_booking_status\(uuid, text\) to authenticated;/);
  assert.doesNotMatch(migration, /\b(?:drop table|truncate|delete from)\b/i);
});
