type T = (key: string, opts?: Record<string, unknown>) => string;

interface LegalErrorData {
  error?: string;
  errorCode?: unknown;
  field?: unknown;
  max?: unknown;
}

const LEGAL_TEXT_LABEL_KEYS: Record<string, string> = {
  terms: 'legal.termsTitle',
  withdrawal: 'legal.withdrawalTitle',
  privacyAddition: 'legal.privacyAddition',
};

/**
 * Builds a localized message for legal-endpoint validation failures from the
 * structured `errorCode`/`field`/`max`; the raw server sentence is only used
 * when there is no (recognised) errorCode.
 */
export function translateLegalError(err: unknown, t: T, fallback: string): string {
  const data = (err as { data?: LegalErrorData } | null | undefined)?.data;
  const raw = data?.error ?? fallback;
  const code = data?.errorCode;
  if (typeof code !== 'string') return raw;

  const fieldKey = typeof data?.field === 'string' ? data.field : undefined;
  const max = data?.max;

  let field: string | undefined;
  if (code === 'TAX_NUMBER_TOO_LONG') {
    field = t('legal.taxNumber');
  } else if (code === 'LEGAL_TEXT_TOO_LONG') {
    const key = fieldKey ? LEGAL_TEXT_LABEL_KEYS[fieldKey] : undefined;
    field = key ? t(key) : fieldKey;
  } else if (fieldKey && code.startsWith('IMPRESSUM_')) {
    field = t(`legal.f.${fieldKey}`);
  } else if (fieldKey && code.startsWith('INVOICE_EXTRAS_')) {
    field = t(`legal.f2.${fieldKey}`);
  }

  switch (code) {
    case 'IMPRESSUM_NOT_OBJECT':
    case 'INVOICE_EXTRAS_NOT_OBJECT':
      return t('legal.error.invalidInput');
    case 'IMPRESSUM_FIELD_TOO_LONG':
    case 'INVOICE_EXTRAS_FIELD_TOO_LONG':
    case 'TAX_NUMBER_TOO_LONG':
    case 'LEGAL_TEXT_TOO_LONG':
      return t('legal.error.tooLong', { field, max });
    case 'IMPRESSUM_LEGAL_FORM_INVALID':
      return t('legal.error.legalFormInvalid');
    case 'IMPRESSUM_EMAIL_INVALID':
      return t('legal.error.emailInvalid', { field });
    case 'IMPRESSUM_VAT_ID_INVALID':
      return t('legal.error.vatIdInvalid', { field });
    case 'INVOICE_EXTRAS_IBAN_INVALID':
      return t('legal.error.ibanInvalid', { field });
    case 'INVOICE_EXTRAS_BIC_INVALID':
      return t('legal.error.bicInvalid', { field });
    default:
      return raw;
  }
}
