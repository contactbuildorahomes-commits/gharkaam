import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { BookingDraft, Language, PaymentMethod, Provider, ServiceCategory, SessionMode } from '../types';
import { categories, providers } from '../data/mock';
import { colors, radius } from '../theme/tokens';
import { AppText, Button, Card, IconCircle, Pill, Stars, formatPKR } from '../components/ui';
import { text } from '../i18n/translations';

const stepKeys = ['chooseService', 'chooseIssue', 'chooseTime', 'chooseProvider', 'payment'];
const addresses = [
  { id: 'model-town', ur: 'ماڈل ٹاؤن، بلاک C، لاہور', en: 'Model Town, Block C, Lahore' },
  { id: 'gulberg', ur: 'گلبرگ III، لاہور', en: 'Gulberg III, Lahore' },
  { id: 'johar-town', ur: 'جوہر ٹاؤن، لاہور', en: 'Johar Town, Lahore' },
];
const slots = [{ id: 'morning', hour: 9 }, { id: 'afternoon', hour: 12 }, { id: 'evening', hour: 16 }];

export function BookingFlowScreen({ language, mode, initialCategory, onBack, onConfirm, serviceCategories = categories, promoAvailable = true }: {
  language: Language;
  mode: SessionMode;
  initialCategory?: ServiceCategory;
  onBack: () => void;
  onConfirm: (draft: BookingDraft) => void | Promise<void>;
  serviceCategories?: ServiceCategory[];
  promoAvailable?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [category, setCategory] = useState<ServiceCategory | undefined>(() => initialCategory ? serviceCategories.find((item) => item.id === initialCategory.id) : undefined);
  const [subtypeId, setSubtypeId] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const [addressId, setAddressId] = useState(addresses[0].id);
  const [day, setDay] = useState<'today' | 'tomorrow'>('tomorrow');
  const [slot, setSlot] = useState('afternoon');
  const [provider, setProvider] = useState<Provider>();
  const [payment] = useState<PaymentMethod>('cash');
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [error, setError] = useState('');
  const ur = language === 'ur';
  const subtype = category?.subtypes.find((item) => item.id === subtypeId);
  const address = (ur ? addresses.find((item) => item.id === addressId)?.ur : addresses.find((item) => item.id === addressId)?.en) ?? '';
  const matchingProviders = providers.filter((item) => category?.id === 'electrician' ? item.tradeEn === 'Electrician' : item.tradeEn === 'Plumber');
  const basePrice = subtype?.startingPrice ?? 0;
  const appliedPromo = promoAvailable && promoApplied;
  const price = appliedPromo ? Math.round(basePrice * 0.85) : basePrice;
  const progressWidth = `${((step + 1) / stepKeys.length) * 100}%` as `${number}%`;

  const togglePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(ur ? 'تصویر منتخب کرنے کے لیے فوٹو لائبریری کی اجازت درکار ہے۔' : 'Photo library permission is needed to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.75 });
    if (!result.canceled && result.assets[0]) { setPhotoUri(result.assets[0].uri); setError(''); }
  };

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(category);
    if (step === 1) return Boolean(subtypeId && description.trim());
    if (step === 2) return Boolean(address && slot);
    if (step === 3) return mode !== 'demo' || Boolean(provider);
    return Boolean(subtype && (mode !== 'demo' || provider));
  }, [step, category, subtypeId, description, address, slot, provider, subtype, mode]);

  const next = () => {
    setError('');
    const scheduled = new Date();
    if (day === 'tomorrow') scheduled.setDate(scheduled.getDate() + 1);
    scheduled.setHours(slots.find((item) => item.id === slot)?.hour ?? 12, 0, 0, 0);
    if (step >= 2 && scheduled.getTime() <= Date.now()) {
      setError(ur ? 'یہ وقت گزر چکا ہے۔ آنے والا وقت منتخب کریں۔' : 'This time has passed. Choose a future slot.');
      return;
    }
    if (!canContinue) {
      setError(step === 1 && !description.trim()
        ? (ur ? 'مسئلے کی مختصر تفصیل لکھیں۔' : 'Please add a short issue description.')
        : (ur ? 'جاری رکھنے سے پہلے انتخاب مکمل کریں۔' : 'Complete the required selection to continue.'));
      return;
    }
    if (step < stepKeys.length - 1) { setStep(step + 1); return; }
    if (!category || !subtype || confirming) return;
    setConfirming(true);
    const draft: BookingDraft = {
      serviceId: category.id,
      subtypeId,
      description: description.trim(),
      photoUri,
      address,
      scheduledAt: scheduled.toISOString(),
      provider,
      preferredProviderName: provider ? (ur ? provider.nameUr : provider.nameEn) : undefined,
      paymentMethod: payment,
      promoCode: appliedPromo ? 'PEHLI15' : undefined,
      price,
    };
    Promise.resolve(onConfirm(draft)).finally(() => setConfirming(false));
  };

  const stepTitle = text(language, stepKeys[step]);
  return <View style={{ gap: 16 }}>
    <View style={[styles.heading, ur && styles.rtlRow]}>
      <Pressable onPress={step ? () => setStep(step - 1) : onBack} style={styles.back} accessibilityRole="button" accessibilityLabel={text(language, 'back')}>
        <Ionicons name={ur ? 'arrow-forward' : 'arrow-back'} size={18} color={colors.forest} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <AppText language={language} size={19} weight="bold">{text(language, 'bookService')}</AppText>
        <AppText language={language} size={11} color={colors.muted}>{ur ? `مرحلہ ${step + 1} از ${stepKeys.length}` : `Step ${step + 1} of ${stepKeys.length}`} · {stepTitle}</AppText>
      </View>
    </View>
    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: progressWidth }]} /></View>

    {step === 0 ? <View style={{ gap: 13 }}>
      <AppText language={language} size={16} weight="bold">{text(language, 'services')}</AppText>
      <View style={styles.categoryList}>
        {serviceCategories.filter((item) => item.available).map((item) => <Pressable key={item.id} onPress={() => { setCategory(item); setSubtypeId(''); }} accessibilityRole="button" accessibilityState={{ selected: category?.id === item.id }}>
          <Card style={[styles.categoryCard, category?.id === item.id && styles.selectedCard]}>
            <IconCircle name={item.icon as keyof typeof Ionicons.glyphMap} background={item.color} />
            <View style={{ flex: 1 }}>
              <AppText language={language} size={15} weight="bold">{ur ? item.titleUr : item.titleEn}</AppText>
              <AppText language={language} size={11} color={colors.muted}>{item.subtypes.length} {ur ? 'کام کی اقسام' : 'service types'}</AppText>
            </View>
            <Ionicons name={category?.id === item.id ? 'checkmark-circle' : ur ? 'chevron-back' : 'chevron-forward'} size={21} color={category?.id === item.id ? colors.jade : colors.muted} />
          </Card>
        </Pressable>)}
      </View>
    </View> : null}

    {step === 1 && category ? <View style={{ gap: 14 }}>
      <AppText language={language} size={16} weight="bold">{text(language, 'subtype')}</AppText>
      <View style={styles.chipGrid}>
        {category.subtypes.filter((item) => item.available !== false).map((item) => <Pressable key={item.id} onPress={() => setSubtypeId(item.id)} style={[styles.subtype, subtypeId === item.id && styles.subtypeSelected]} accessibilityRole="button" accessibilityState={{ selected: subtypeId === item.id }}>
          <AppText language={language} size={12} weight={subtypeId === item.id ? 'bold' : 'regular'} color={subtypeId === item.id ? colors.forest : colors.ink}>{ur ? item.titleUr : item.titleEn}</AppText>
          <AppText language="en" size={10} color={colors.muted}>{formatPKR(item.startingPrice)}+</AppText>
        </Pressable>)}
      </View>
      <AppText language={language} size={13} weight="bold" style={{ marginTop: 2 }}>{text(language, 'describe')}</AppText>
      <TextInput value={description} onChangeText={setDescription} placeholder={text(language, 'describeHint')} placeholderTextColor="#A0AEA6" multiline numberOfLines={4} textAlignVertical="top" style={[styles.textArea, { textAlign: ur ? 'right' : 'left', writingDirection: ur ? 'rtl' : 'ltr' }]} />
      <View style={[styles.photoRow, ur && styles.rtlRow]}>
        <Pressable onPress={togglePhoto} style={[styles.photoButton, { flex: 1 }, ur && styles.rtlRow]}>
          <Ionicons name={photoUri ? 'checkmark-circle' : 'camera-outline'} size={20} color={colors.jade} />
          <AppText language={language} size={13} color={colors.jade} weight="bold">{text(language, photoUri ? 'photoAdded' : 'addPhoto')}</AppText>
        </Pressable>
        {photoUri ? <Pressable accessibilityRole="button" accessibilityLabel={ur ? 'تصویر ہٹائیں' : 'Remove photo'} onPress={() => setPhotoUri(undefined)} style={styles.removePhoto}><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable> : null}
      </View>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
    </View> : null}

    {step === 2 ? <View style={{ gap: 15 }}>
      <AppText language={language} size={16} weight="bold">{text(language, 'schedule')}</AppText>
      <View style={[styles.optionRow, ur && styles.rtlRow]}>
        {(['today', 'tomorrow'] as const).map((value) => <Pressable key={value} onPress={() => setDay(value)} style={[styles.option, day === value && styles.optionActive]}>
          <Ionicons name={value === 'today' ? 'sunny-outline' : 'calendar-outline'} size={17} color={day === value ? colors.jade : colors.muted} />
          <AppText language={language} size={12} weight={day === value ? 'bold' : 'regular'}>{text(language, value)}</AppText>
        </Pressable>)}
      </View>
      <View style={styles.slotList}>
        {slots.map((item) => <Pressable key={item.id} onPress={() => setSlot(item.id)} style={[styles.slot, slot === item.id && styles.optionActive, ur && styles.rtlRow]}>
          <Ionicons name={slot === item.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={slot === item.id ? colors.jade : colors.muted} />
          <AppText language={language} size={13}>{text(language, item.id)}</AppText><View style={{ flex: 1 }} />
          <AppText language="en" size={10} color={colors.muted}>3 slots</AppText>
        </Pressable>)}
      </View>
      <AppText language={language} size={15} weight="bold" style={{ marginTop: 5 }}>{text(language, 'address')}</AppText>
      {addresses.map((item) => <Pressable key={item.id} onPress={() => setAddressId(item.id)} style={[styles.addressOption, ur && styles.rtlRow]}>
        <Ionicons name={item.id === addressId ? 'radio-button-on' : 'radio-button-off'} color={item.id === addressId ? colors.jade : colors.muted} size={18} />
        <View style={{ flex: 1 }}><AppText language={language} size={12} weight="medium">{ur ? item.ur : item.en}</AppText><AppText language={language} size={10} color={colors.muted}>{ur ? 'گھر' : 'Home'}</AppText></View>
        <Ionicons name="location-outline" size={16} color={colors.jade} />
      </Pressable>)}
    </View> : null}

    {step === 3 ? <View style={{ gap: 12 }}>
      <AppText language={language} size={16} weight="bold">{text(language, mode === 'demo' ? 'demoProviderPreferences' : 'providerAssignment')}</AppText>
      {mode === 'demo' ? <>
        <Card style={[styles.noticeCard, ur && styles.rtlRow]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.jade} />
          <AppText language={language} size={11} color={colors.inkSoft} style={{ flex: 1 }}>{text(language, 'demoPreferenceHint')}</AppText>
        </Card>
        {matchingProviders.map((item) => <Pressable key={item.id} onPress={() => setProvider(item)} accessibilityRole="button" accessibilityState={{ selected: provider?.id === item.id }}>
          <Card style={[styles.providerCard, provider?.id === item.id && styles.selectedCard]}>
            <View style={[styles.providerTop, ur && styles.rtlRow]}>
              <View style={styles.avatar}><AppText language="ur" size={18} weight="bold" color={colors.forest}>{item.nameUr.slice(0, 1)}</AppText></View>
              <View style={{ flex: 1 }}>
                <View style={[styles.nameLine, ur && styles.rtlRow]}>
                  <AppText language={language} size={14} weight="bold">{ur ? item.nameUr : item.nameEn}</AppText>
                  <Pill language={language} label={text(language, 'sampleProfile')} tone="neutral" />
                </View>
                <AppText language={language} size={10} color={colors.muted}>{ur ? item.tradeUr : item.tradeEn} · {item.eta}</AppText>
                <View style={[styles.stats, ur && styles.rtlRow]}><Stars value={item.rating} size={12} /><AppText language="en" size={10} color={colors.muted}>({item.reviews} {text(language, 'reviews')})</AppText></View>
              </View>
              <View style={{ alignItems: 'flex-end' }}><AppText language="en" size={12} weight="bold" color={colors.forest}>{formatPKR(item.startingPrice)}</AppText><AppText language={language} size={9} color={colors.muted}>{text(language, 'from')}</AppText></View>
            </View>
          </Card>
        </Pressable>)}
      </> : <Card style={[styles.noticeCard, ur && styles.rtlRow]}>
        <Ionicons name="time-outline" size={18} color={colors.jade} />
        <AppText language={language} size={11} color={colors.inkSoft} style={{ flex: 1 }}>{text(language, 'providerAssignmentHint')}</AppText>
      </Card>}
    </View> : null}

    {step === 4 && category && subtype ? <View style={{ gap: 15 }}>
      <Card style={styles.summary}>
        <AppText language={language} size={15} weight="bold">{text(language, 'confirmation')}</AppText>
        <SummaryLine language={language} label={text(language, 'services')} value={`${ur ? category.titleUr : category.titleEn} · ${ur ? subtype.titleUr : subtype.titleEn}`} />
        <SummaryLine language={language} label={text(language, 'providerPreference')} value={provider ? (ur ? provider.nameUr : provider.nameEn) : text(language, 'noProviderPreference')} />
        <SummaryLine language={language} label={text(language, 'chooseTime')} value={`${text(language, day)} · ${text(language, slot)}`} />
        <SummaryLine language={language} label={text(language, 'address')} value={address} />
        <AppText language={language} size={10} color={colors.muted}>{text(language, mode === 'demo' ? 'demoPreferenceHint' : 'providerAssignmentHint')}</AppText>
      </Card>
      <AppText language={language} size={15} weight="bold">{text(language, 'payWith')}</AppText>
      <Card style={[styles.payment, ur && styles.rtlRow]}>
        <Ionicons name="cash-outline" size={20} color={colors.jade} />
        <View style={{ flex: 1 }}><AppText language={language} size={12} weight="bold">{text(language, 'cash')}</AppText><AppText language={language} size={10} color={colors.muted}>{text(language, 'cashOnlyNotice')}</AppText></View>
        <Ionicons name="checkmark-circle" size={18} color={colors.jade} />
      </Card>
      <Card style={styles.promo}>
        <AppText language={language} size={13} weight="bold">{text(language, 'offer')}</AppText>
        <View style={[styles.promoRow, ur && styles.rtlRow]}>
          <TextInput value={promoInput} onChangeText={setPromoInput} autoCapitalize="characters" placeholder={text(language, 'promoCode')} placeholderTextColor={colors.muted} style={[styles.promoInput, { textAlign: ur ? 'right' : 'left' }]} />
          <Button language={language} disabled={!promoAvailable} title={text(language, 'apply')} onPress={() => {
            const code = promoInput.trim().toUpperCase();
            const valid = promoAvailable && code === 'PEHLI15';
            setPromoApplied(valid);
            setError(valid || !promoAvailable ? '' : (ur ? 'یہ کوڈ درست نہیں ہے۔' : 'That code is not valid.'));
          }} style={{ minHeight: 40, paddingHorizontal: 14 }} />
          {appliedPromo ? <Pill language={language} label={text(language, 'applied')} /> : null}
        </View>
      </Card>
      <View style={[styles.total, ur && styles.rtlRow]}><AppText language={language} size={14} weight="bold">{text(language, 'total')}</AppText><AppText language="en" size={18} weight="bold" color={colors.forest}>{formatPKR(price)}</AppText></View>
      <AppText language={language} size={10} color={colors.muted}>{text(language, 'demoLabel')}</AppText>
    </View> : null}

    {error ? <View style={styles.error}><AppText language={language} size={12} color={colors.red}>{error}</AppText></View> : null}
    <View style={[styles.footer, ur && styles.rtlRow]}>
      <Button language={language} disabled={confirming} title={confirming ? (ur ? 'محفوظ ہو رہا ہے…' : 'Saving…') : step === stepKeys.length - 1 ? text(language, 'confirmBooking') : text(language, 'continue')} icon={step === stepKeys.length - 1 ? 'checkmark' : ur ? 'arrow-back' : 'arrow-forward'} onPress={next} style={{ flex: 1 }} />
      <Pressable onPress={step ? () => setStep(step - 1) : onBack} style={styles.cancel}><AppText language={language} size={12} color={colors.muted}>{text(language, 'back')}</AppText></Pressable>
    </View>
  </View>;
}

function SummaryLine({ language, label, value }: { language: Language; label: string; value: string }) {
  return <View style={[styles.summaryLine, language === 'ur' && styles.rtlRow]}><AppText language={language} size={11} color={colors.muted} style={{ flex: 1 }}>{label}</AppText><AppText language={language} size={11} weight="bold" style={{ flex: 1.5 }}>{value}</AppText></View>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  back: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  progressTrack: { height: 5, backgroundColor: '#E8ECE6', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: colors.jade, borderRadius: 5 },
  categoryList: { gap: 10 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  selectedCard: { borderColor: colors.jade, backgroundColor: '#F3FAF5', borderWidth: 1.5 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  subtype: { minWidth: '47%', flexGrow: 1, padding: 12, gap: 4, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 14 },
  subtypeSelected: { borderColor: colors.jade, backgroundColor: colors.mint },
  textArea: { minHeight: 98, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 13, color: colors.ink, fontSize: 13 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  removePhoto: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  preview: { width: 110, height: 110, borderRadius: 14 },
  optionRow: { flexDirection: 'row', gap: 9 },
  option: { flex: 1, minHeight: 45, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', gap: 7, flexDirection: 'row' },
  optionActive: { borderColor: colors.jade, backgroundColor: colors.mint },
  slotList: { gap: 8 },
  slot: { minHeight: 46, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  addressOption: { minHeight: 52, borderRadius: 14, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.mint, padding: 12 },
  providerCard: { padding: 13 },
  providerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  nameLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  summary: { gap: 11 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  payment: { minHeight: 62, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.jade, borderRadius: 14, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', gap: 10 },
  promo: { gap: 9, padding: 13 },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoInput: { flex: 1, height: 40, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 10, fontSize: 12, color: colors.ink },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.line },
  error: { backgroundColor: colors.redSoft, borderRadius: 12, padding: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  cancel: { padding: 10 },
  rtlRow: { flexDirection: 'row-reverse' },
});
