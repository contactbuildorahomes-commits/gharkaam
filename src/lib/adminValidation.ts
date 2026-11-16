export type AdminFieldErrors = Record<string, string>;

export function normalizeServiceId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function normalizePromoCode(value: string): string {
  return value.trim().toUpperCase();
}

export function validateCategoryDraft(input: { id: string; titleEn: string; titleUr: string; icon: string }): AdminFieldErrors {
  const errors: AdminFieldErrors = {};
  const id = normalizeServiceId(input.id);
  if (!id) errors.id = 'required';
  else if (id.length > 48) errors.id = 'too_long';
  if (!input.titleEn.trim()) errors.titleEn = 'required';
  if (!input.titleUr.trim()) errors.titleUr = 'required';
  if (!input.icon.trim()) errors.icon = 'required';
  else if (input.icon.trim().length > 40) errors.icon = 'icon_too_long';
  return errors;
}

export function validateSubtypeDraft(input: { id: string; titleEn: string; titleUr: string; price: string }): AdminFieldErrors {
  const errors: AdminFieldErrors = {};
  const id = normalizeServiceId(input.id);
  if (!id) errors.id = 'required';
  else if (id.length > 64) errors.id = 'too_long';
  if (!input.titleEn.trim()) errors.titleEn = 'required';
  if (!input.titleUr.trim()) errors.titleUr = 'required';
  const price = Number(input.price);
  if (!input.price.trim()) errors.price = 'required';
  else if (!Number.isSafeInteger(price) || price < 0) errors.price = 'invalid_price';
  return errors;
}

export function validatePromotionDraft(input: {
  code: string;
  titleEn: string;
  titleUr: string;
  discountPercent: string;
  expiresOn: string;
  usageLimit: string;
}): AdminFieldErrors {
  const errors: AdminFieldErrors = {};
  const code = normalizePromoCode(input.code);
  if (!code) errors.code = 'required';
  else if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) errors.code = 'invalid_code';
  if (!input.titleEn.trim()) errors.titleEn = 'required';
  if (!input.titleUr.trim()) errors.titleUr = 'required';
  const discount = Number(input.discountPercent);
  if (!input.discountPercent.trim()) errors.discountPercent = 'required';
  else if (!Number.isSafeInteger(discount) || discount < 1 || discount > 100) errors.discountPercent = 'invalid_discount';
  if (input.expiresOn.trim()) {
    const parsed = new Date(`${input.expiresOn.trim()}T23:59:59Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn.trim()) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.expiresOn.trim()) {
      errors.expiresOn = 'invalid_date';
    }
  }
  if (input.usageLimit.trim()) {
    const limit = Number(input.usageLimit);
    if (!Number.isSafeInteger(limit) || limit < 1) errors.usageLimit = 'invalid_limit';
  }
  return errors;
}

export function hasValidationErrors(errors: AdminFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
