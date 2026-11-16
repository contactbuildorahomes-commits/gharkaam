import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Booking, Language, ServiceCategory, ServiceSubtype, SessionMode } from '../types';
import { loadAdminProviderPage, type AdminPromotion, type AdminProviderRecord } from '../data/repository';
import { hasValidationErrors, normalizePromoCode, normalizeServiceId, validateCategoryDraft, validatePromotionDraft, validateSubtypeDraft, type AdminFieldErrors } from '../lib/adminValidation';
import { AppText, Button, Card, Pill, formatPKR } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';

const copy = (language: Language, en: string, ur: string) => language === 'ur' ? ur : en;

export function ServiceCategoryForm({ language, visible, initial, onClose, onSave }: {
  language: Language; visible: boolean; initial: ServiceCategory | null; onClose: () => void;
  onSave: (value: ServiceCategory, isUpdate: boolean) => Promise<void>;
}) {
  const [id, setId] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleUr, setTitleUr] = useState('');
  const [icon, setIcon] = useState('construct');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<AdminFieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const ur = language === 'ur';

  useEffect(() => {
    if (!visible) return;
    setId(initial?.id ?? ''); setTitleEn(initial?.titleEn ?? ''); setTitleUr(initial?.titleUr ?? '');
    setIcon(initial?.icon ?? 'construct'); setActive(initial?.available ?? true); setErrors({}); setServerError('');
  }, [visible, initial?.id]);

  const submit = async () => {
    const nextErrors = validateCategoryDraft({ id, titleEn, titleUr, icon });
    setErrors(nextErrors); setServerError('');
    if (hasValidationErrors(nextErrors)) return;
    setSaving(true);
    try {
      await onSave({
        id: normalizeServiceId(id), titleEn: titleEn.trim(), titleUr: titleUr.trim(), icon,
        color: initial?.color ?? colors.mint, available: active, sortOrder: initial?.sortOrder ?? 0, subtypes: initial?.subtypes ?? [],
      }, Boolean(initial));
      onClose();
    } catch (error: any) {
      setServerError(error?.message ?? copy(language, 'Could not save this service.', 'سروس محفوظ نہیں ہو سکی۔'));
    } finally { setSaving(false); }
  };

  return <FormModal language={language} visible={visible} title={initial ? copy(language, 'Edit service', 'سروس میں ترمیم') : copy(language, 'New service', 'نئی سروس')} onClose={onClose}>
    <Field language={language} label={copy(language, 'Service ID (lowercase)', 'سروس آئی ڈی (انگریزی)')} value={id} onChangeText={setId} error={errors.id} locked={Boolean(initial)} autoCapitalize="none" />
    <Field language="en" label="English name" value={titleEn} onChangeText={setTitleEn} error={errors.titleEn} autoCapitalize="sentences" />
    <Field language="ur" label="اردو نام" value={titleUr} onChangeText={setTitleUr} error={errors.titleUr} autoCapitalize="sentences" />
    <View style={{ gap: 7 }}><AppText language={language} size={11} weight="bold">{copy(language, 'Service icon', 'سروس کا آئیکن')}</AppText><View style={styles.iconChoices}>{['construct', 'flash', 'water', 'snow', 'home', 'hammer'].map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: icon === item }} onPress={() => setIcon(item)} style={[styles.iconChoice, icon === item && styles.iconChoiceSelected]}><Ionicons name={item as keyof typeof Ionicons.glyphMap} size={17} color={icon === item ? colors.white : colors.forest} /></Pressable>)}</View>{errors.icon ? <FieldError language={language} code={errors.icon} /> : null}</View>
    <ToggleRow language={language} label={copy(language, 'Visible to customers', 'گاہکوں کے لیے فعال')} value={active} onValueChange={setActive} />
    <FormError language={language} error={serverError} />
    <FormActions language={language} saving={saving} onCancel={onClose} onSave={() => void submit()} />
  </FormModal>;
}

export function ServiceSubtypeForm({ language, visible, categoryId, initial, nextSortOrder, onClose, onSave }: {
  language: Language; visible: boolean; categoryId: string; initial: ServiceSubtype | null; nextSortOrder: number; onClose: () => void;
  onSave: (value: ServiceSubtype, active: boolean, sortOrder: number, isUpdate: boolean) => Promise<void>;
}) {
  const [id, setId] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleUr, setTitleUr] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<AdminFieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const ur = language === 'ur';

  useEffect(() => {
    if (!visible) return;
    setId(initial?.id ?? ''); setTitleEn(initial?.titleEn ?? ''); setTitleUr(initial?.titleUr ?? '');
    setPrice(initial ? String(initial.startingPrice) : ''); setActive(initial?.available ?? true); setErrors({}); setServerError('');
  }, [visible, initial?.id, categoryId]);

  const submit = async () => {
    const nextErrors = validateSubtypeDraft({ id, titleEn, titleUr, price });
    setErrors(nextErrors); setServerError('');
    if (hasValidationErrors(nextErrors)) return;
    setSaving(true);
    try {
      await onSave({ id: normalizeServiceId(id), titleEn: titleEn.trim(), titleUr: titleUr.trim(), startingPrice: Number(price), available: active, sortOrder: initial?.sortOrder ?? nextSortOrder }, active, initial?.sortOrder ?? nextSortOrder, Boolean(initial));
      onClose();
    } catch (error: any) {
      setServerError(error?.message ?? copy(language, 'Could not save this service type.', 'ذیلی سروس محفوظ نہیں ہو سکی۔'));
    } finally { setSaving(false); }
  };

  return <FormModal language={language} visible={visible} title={initial ? copy(language, 'Edit service type', 'ذیلی سروس میں ترمیم') : copy(language, 'New service type', 'نئی ذیلی سروس')} onClose={onClose}>
    <Field language="en" label={copy(language, 'Service type ID (lowercase)', 'ذیلی سروس آئی ڈی (انگریزی)')} value={id} onChangeText={setId} error={errors.id} locked={Boolean(initial)} autoCapitalize="none" />
    <Field language="en" label="English name" value={titleEn} onChangeText={setTitleEn} error={errors.titleEn} autoCapitalize="sentences" />
    <Field language="ur" label="اردو نام" value={titleUr} onChangeText={setTitleUr} error={errors.titleUr} autoCapitalize="sentences" />
    <Field language={language} label={copy(language, 'Starting price (PKR)', 'ابتدائی قیمت (روپے)')} value={price} onChangeText={setPrice} error={errors.price} keyboardType="number-pad" />
    <ToggleRow language={language} label={copy(language, 'Visible to customers', 'گاہکوں کے لیے فعال')} value={active} onValueChange={setActive} />
    <FormError language={language} error={serverError} />
    <FormActions language={language} saving={saving} onCancel={onClose} onSave={() => void submit()} />
  </FormModal>;
}

export function PromotionForm({ language, visible, initial, onClose, onSave }: {
  language: Language; visible: boolean; initial: AdminPromotion | null; onClose: () => void;
  onSave: (value: AdminPromotion, isUpdate: boolean) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleUr, setTitleUr] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<AdminFieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const ur = language === 'ur';

  useEffect(() => {
    if (!visible) return;
    setCode(initial?.code ?? ''); setTitleEn(initial?.titleEn ?? ''); setTitleUr(initial?.titleUr ?? '');
    setDiscountPercent(initial ? String(initial.discountPercent) : '');
    setExpiresOn(initial?.expiresAt ? initial.expiresAt.slice(0, 10) : '');
    setUsageLimit(initial?.usageLimit ? String(initial.usageLimit) : ''); setActive(initial?.active ?? true);
    setErrors({}); setServerError('');
  }, [visible, initial?.code]);

  const submit = async () => {
    const nextErrors = validatePromotionDraft({ code, titleEn, titleUr, discountPercent, expiresOn, usageLimit });
    setErrors(nextErrors); setServerError('');
    if (hasValidationErrors(nextErrors)) return;
    setSaving(true);
    try {
      await onSave({
        code: normalizePromoCode(code), titleEn: titleEn.trim(), titleUr: titleUr.trim(), discountPercent: Number(discountPercent), active,
        expiresAt: expiresOn.trim() ? new Date(`${expiresOn.trim()}T23:59:59`).toISOString() : null,
        usageLimit: usageLimit.trim() ? Number(usageLimit) : null,
      }, Boolean(initial));
      onClose();
    } catch (error: any) {
      setServerError(error?.message ?? copy(language, 'Could not save this offer.', 'آفر محفوظ نہیں ہو سکی۔'));
    } finally { setSaving(false); }
  };

  return <FormModal language={language} visible={visible} title={initial ? copy(language, 'Edit offer', 'آفر میں ترمیم') : copy(language, 'New offer', 'نئی آفر')} onClose={onClose}>
    <Field language="en" label={copy(language, 'Offer code', 'آفر کوڈ')} value={code} onChangeText={setCode} error={errors.code} locked={Boolean(initial)} autoCapitalize="characters" />
    <Field language="en" label="English offer title" value={titleEn} onChangeText={setTitleEn} error={errors.titleEn} autoCapitalize="sentences" />
    <Field language="ur" label="اردو میں آفر کا عنوان" value={titleUr} onChangeText={setTitleUr} error={errors.titleUr} autoCapitalize="sentences" />
    <Field language={language} label={copy(language, 'Discount percent (1–100)', 'رعایت فیصد (1–100)')} value={discountPercent} onChangeText={setDiscountPercent} error={errors.discountPercent} keyboardType="number-pad" />
    <Field language="en" label={copy(language, 'Expiry date (YYYY-MM-DD, optional)', 'میعاد کی تاریخ (YYYY-MM-DD، اختیاری)')} value={expiresOn} onChangeText={setExpiresOn} error={errors.expiresOn} placeholder="2027-03-31" autoCapitalize="none" />
    <Field language={language} label={copy(language, 'Global usage limit (optional)', 'کل استعمال کی حد (اختیاری)')} value={usageLimit} onChangeText={setUsageLimit} error={errors.usageLimit} keyboardType="number-pad" />
    <ToggleRow language={language} label={copy(language, 'Offer is active', 'آفر فعال ہے')} value={active} onValueChange={setActive} />
    <AppText language={language} size={9} color={colors.muted}>{copy(language, 'Usage caps are enforced atomically when a customer books. The code cannot be renamed after creation.', 'استعمال کی حد بکنگ کے وقت محفوظ طریقے سے نافذ ہوتی ہے۔ بننے کے بعد کوڈ تبدیل نہیں کیا جا سکتا۔')}</AppText>
    <FormError language={language} error={serverError} />
    <FormActions language={language} saving={saving} onCancel={onClose} onSave={() => void submit()} />
  </FormModal>;
}

export function ProviderAssignmentModal({ language, booking, providers, mode, visible, onClose, onAssign }: {
  language: Language; booking: Booking | null; providers: AdminProviderRecord[]; mode: SessionMode; visible: boolean; onClose: () => void;
  onAssign: (provider: AdminProviderRecord) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [providerQuery, setProviderQuery] = useState('');
  const [eligible, setEligible] = useState<AdminProviderRecord[]>([]);
  const [totalEligible, setTotalEligible] = useState(0);
  const [providerOffset, setProviderOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const ur = language === 'ur';

  useEffect(() => { if (visible) { setSelectedId(''); setSaving(false); setError(''); setProviderQuery(''); } }, [visible, booking?.id]);

  useEffect(() => {
    if (!visible || !booking) return;
    let mounted = true;
    setLoading(true); setError(''); setSelectedId('');
    const timer = setTimeout(() => {
      const load = async () => {
        try {
          if (mode === 'demo') {
            const needle = providerQuery.trim().toLowerCase();
            const rows = providers.filter((provider) => provider.status === 'approved' && provider.categoryIds.includes(booking.serviceId)
              && (!needle || `${provider.name} ${provider.phone} ${provider.serviceArea}`.toLowerCase().includes(needle)));
            if (mounted) { setEligible(rows); setTotalEligible(rows.length); setProviderOffset(rows.length); }
          } else {
            const result = await loadAdminProviderPage(providerQuery, 'approved', 0, 100, booking.serviceId);
            if (mounted) { setEligible(result.providers); setTotalEligible(result.totalCount); setProviderOffset(result.providers.length); }
          }
        } catch (reason: any) {
          if (mounted) { setEligible([]); setTotalEligible(0); setProviderOffset(0); setError(reason?.message ?? copy(language, 'Could not load eligible providers.', 'اہل ماہرین لوڈ نہیں ہو سکے۔')); }
        } finally { if (mounted) setLoading(false); }
      };
      void load();
    }, providerQuery ? 250 : 0);
    return () => { mounted = false; clearTimeout(timer); };
  }, [visible, booking?.id, booking?.serviceId, providers, mode, providerQuery, language]);

  if (!booking) return null;
  const selected = eligible.find((provider) => provider.id === selectedId);
  const loadMore = async () => {
    if (mode === 'demo') return;
    setLoadingMore(true); setError('');
    try {
      const result = await loadAdminProviderPage(providerQuery, 'approved', providerOffset, 100, booking.serviceId);
      setEligible((current) => [...current, ...result.providers]); setProviderOffset((current) => current + result.providers.length); setTotalEligible(result.totalCount);
    } catch (reason: any) { setError(reason?.message ?? copy(language, 'Could not load more providers.', 'مزید ماہرین لوڈ نہیں ہو سکے۔')); }
    finally { setLoadingMore(false); }
  };
  const submit = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try { await onAssign(selected); onClose(); }
    catch (reason: any) { setError(reason?.message ?? copy(language, 'Assignment failed. Refresh and try again.', 'تفویض نہیں ہو سکی۔ تازہ کر کے دوبارہ کوشش کریں۔')); }
    finally { setSaving(false); }
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.modalCard}>
      <View style={[styles.modalHeader, ur && styles.rtlRow]}><View style={{ flex: 1 }}><AppText language={language} size={17} weight="bold">{copy(language, 'Assign a provider', 'ماہر تفویض کریں')}</AppText><AppText language={language} size={10} color={colors.muted}>{copy(language, 'Pending booking', 'زیرِ انتظار بکنگ')} · {booking.id.slice(0, 8)}</AppText></View><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={copy(language, 'Close', 'بند کریں')}><Ionicons name="close" size={21} color={colors.inkSoft} /></Pressable></View>
      <AppText language={language} size={11} color={colors.inkSoft}>{copy(language, 'Only approved providers offering this service are shown. Check the listed service area yourself; confirming assigns the job and marks it accepted.', 'صرف منظور شدہ اور یہ سروس دینے والے ماہرین دکھائے گئے ہیں۔ درج سروس ایریا خود چیک کریں؛ تصدیق سے بکنگ تفویض اور قبول ہو جائے گی۔')}</AppText>
      <TextInput value={providerQuery} onChangeText={setProviderQuery} placeholder={copy(language, 'Search approved providers…', 'منظور شدہ ماہرین تلاش کریں…')} placeholderTextColor={colors.muted} autoCapitalize="none" style={[styles.input, ur && { textAlign: 'right', writingDirection: 'rtl' }]} />
      <AppText language={language} size={9} color={colors.muted}>{copy(language, `${eligible.length} of ${totalEligible} eligible providers`, `${eligible.length} از ${totalEligible} اہل ماہرین`)}</AppText>
      <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {loading ? <Card style={styles.emptyCard}><ActivityIndicator color={colors.jade} /><AppText language={language} size={11} color={colors.muted}>{copy(language, 'Loading eligible providers…', 'اہل ماہرین لوڈ ہو رہے ہیں…')}</AppText></Card> : null}
        {eligible.map((provider) => <Pressable key={provider.id} onPress={() => { setSelectedId(provider.id); setError(''); }} accessibilityRole="radio" accessibilityState={{ selected: selectedId === provider.id }} style={[styles.providerOption, selectedId === provider.id && styles.providerOptionSelected, ur && styles.rtlRow]}>
          <View style={styles.providerAvatar}><AppText language="en" size={14} weight="bold" color={colors.forest}>{provider.name.charAt(0) || 'G'}</AppText></View>
          <View style={{ flex: 1 }}><AppText language={language} size={12} weight="bold">{provider.name}</AppText><AppText language={language} size={9} color={colors.muted}>{provider.serviceArea} · {provider.completedJobs} {copy(language, 'completed jobs', 'مکمل کام')}</AppText></View>
          <Pill language={language} label={`${provider.rating.toFixed(1)} ★`} tone="mint" />
        </Pressable>)}
        {!loading && !error && !eligible.length ? <Card style={styles.emptyCard}><Ionicons name="people-outline" size={25} color={colors.muted} /><AppText language={language} size={12} weight="bold">{copy(language, providerQuery ? 'No matching providers' : 'No eligible providers', providerQuery ? 'کوئی ماہر نہیں ملا' : 'کوئی اہل ماہر نہیں')}</AppText><AppText language={language} size={10} color={colors.muted}>{copy(language, providerQuery ? 'Try another search term.' : 'Approve a provider for this service before assigning it.', providerQuery ? 'تلاش کے الفاظ بدل کر دیکھیں۔' : 'تفویض سے پہلے اس سروس کے ماہر کو منظور کریں۔')}</AppText></Card> : null}
      </ScrollView>
      {error ? <FormError language={language} error={error} /> : null}
      {!loading && eligible.length < totalEligible ? <Button language={language} title={loadingMore ? copy(language, 'Loading…', 'لوڈ ہو رہا ہے…') : copy(language, 'Load more providers', 'مزید ماہرین دکھائیں')} variant="outline" onPress={() => void loadMore()} disabled={loadingMore} /> : null}
      {selected ? <View style={[styles.confirmAssignment, ur && styles.rtlRow]}><Ionicons name="information-circle-outline" size={16} color={colors.blue} /><AppText language={language} size={10} color={colors.inkSoft} style={{ flex: 1 }}>{copy(language, `Assign to ${selected.name}? The booking will move to Accepted.`, `${selected.name} کو تفویض کریں؟ بکنگ قبول شدہ ہو جائے گی۔`)}</AppText></View> : null}
      <View style={[styles.actions, ur && styles.rtlRow]}><Button language={language} title={copy(language, 'Back', 'واپس')} variant="outline" onPress={onClose} disabled={saving} style={{ flex: 1 }} /><Button language={language} title={saving ? copy(language, 'Assigning…', 'تفویض ہو رہی ہے…') : copy(language, 'Confirm assignment', 'تفویض کی تصدیق')} icon="checkmark" onPress={() => void submit()} disabled={!selected || saving} style={{ flex: 1 }} /></View>
    </View></View>
  </Modal>;
}

function FormModal({ language, visible, title, children, onClose }: { language: Language; visible: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.modalCard}>
      <View style={[styles.modalHeader, language === 'ur' && styles.rtlRow]}><AppText language={language} size={17} weight="bold" style={{ flex: 1 }}>{title}</AppText><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={copy(language, 'Close', 'بند کریں')}><Ionicons name="close" size={21} color={colors.inkSoft} /></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>{children}</ScrollView>
    </View></View>
  </Modal>;
}

function Field({ language, label, value, onChangeText, error, locked = false, ...inputProps }: {
  language: Language; label: string; value: string; onChangeText: (value: string) => void; error?: string; locked?: boolean;
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText'>) {
  const rtl = language === 'ur';
  return <View style={{ gap: 5 }}>
    <AppText language={language} size={10} weight="bold">{label}</AppText>
    <TextInput value={value} onChangeText={onChangeText} editable={!locked} placeholder={label} placeholderTextColor={colors.muted}
      autoCorrect={false} style={[styles.input, { textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }, locked && styles.inputLocked, error && styles.inputError]}
      {...inputProps} />
    {locked ? <AppText language={language} size={8} color={colors.muted}>{copy(language, 'Service identifiers stay fixed to protect existing bookings.', 'پرانے ریکارڈ محفوظ رکھنے کے لیے آئی ڈی تبدیل نہیں کی جا سکتی۔')}</AppText> : null}
    {error ? <FieldError language={language} code={error} /> : null}
  </View>;
}

function FieldError({ language, code }: { language: Language; code: string }) {
  const text = code === 'required' ? copy(language, 'This field is required.', 'یہ خانہ ضروری ہے۔')
    : code === 'too_long' ? copy(language, 'This identifier is too long.', 'یہ آئی ڈی بہت طویل ہے۔')
    : code === 'icon_too_long' ? copy(language, 'This icon name is too long.', 'آئیکن کا نام بہت طویل ہے۔')
    : code === 'invalid_price' ? copy(language, 'Enter a whole PKR amount of zero or more.', 'صفر یا اس سے زیادہ مکمل روپے درج کریں۔')
    : code === 'invalid_discount' ? copy(language, 'Enter a whole percent from 1 to 100.', '1 سے 100 تک مکمل فیصد درج کریں۔')
    : code === 'invalid_code' ? copy(language, 'Use 3–32 letters, numbers, hyphens, or underscores.', '3–32 حروف، اعداد، ڈیش یا انڈر اسکور استعمال کریں۔')
    : code === 'invalid_date' ? copy(language, 'Use a valid YYYY-MM-DD date.', 'درست YYYY-MM-DD تاریخ درج کریں۔')
    : code === 'invalid_limit' ? copy(language, 'Enter a positive whole-number limit.', 'مثبت مکمل عدد کی حد درج کریں۔')
    : copy(language, 'Check this value.', 'اس قدر کو درست کریں۔');
  return <AppText language={language} size={9} color={colors.red}>{text}</AppText>;
}

function ToggleRow({ language, label, value, onValueChange }: { language: Language; label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={[styles.toggleRow, language === 'ur' && styles.rtlRow]}><AppText language={language} size={11} weight="medium" style={{ flex: 1 }}>{label}</AppText><Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#D8DFD9', true: '#85B69F' }} thumbColor={value ? colors.jade : '#F5F5F5'} /></View>;
}

function FormError({ language, error }: { language: Language; error: string }) {
  if (!error) return null;
  return <View style={[styles.serverError, language === 'ur' && styles.rtlRow]}><Ionicons name="alert-circle-outline" size={15} color={colors.red} /><AppText language={language} size={10} color={colors.red} style={{ flex: 1 }}>{error}</AppText></View>;
}

function FormActions({ language, saving, onCancel, onSave }: { language: Language; saving: boolean; onCancel: () => void; onSave: () => void }) {
  return <View style={[styles.actions, language === 'ur' && styles.rtlRow]}><Button language={language} title={copy(language, 'Cancel', 'منسوخ')} variant="outline" onPress={onCancel} disabled={saving} style={{ flex: 1 }} /><Button language={language} title={saving ? copy(language, 'Saving…', 'محفوظ ہو رہا ہے…') : copy(language, 'Save changes', 'تبدیلی محفوظ کریں')} icon={saving ? undefined : 'checkmark'} onPress={onSave} disabled={saving} style={{ flex: 1 }} /></View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,31,25,0.48)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCard: { width: '100%', maxWidth: 480, maxHeight: '92%', backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { minHeight: 43, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 11, paddingVertical: 8, color: colors.ink, backgroundColor: '#FCFDFB', fontSize: 13, outlineStyle: 'none' as any },
  inputLocked: { backgroundColor: '#F2F4F1', color: colors.muted }, inputError: { borderColor: colors.red },
  toggleRow: { minHeight: 40, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  iconChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, iconChoice: { width: 39, height: 37, borderRadius: 11, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, iconChoiceSelected: { backgroundColor: colors.forest },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  serverError: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9, backgroundColor: colors.redSoft, borderRadius: 11 },
  providerOption: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  providerOptionSelected: { borderColor: colors.jade, backgroundColor: '#F1F7F2' }, providerAvatar: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint },
  confirmAssignment: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.blueSoft, borderRadius: 10, padding: 9 },
  emptyCard: { alignItems: 'center', gap: 5, padding: 18 }, rtlRow: { flexDirection: 'row-reverse' },
});
