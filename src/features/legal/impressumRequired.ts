import {
  BASE_REQUIRED_IMPRESSUM_KEYS,
  FORMS_NEEDING_REGISTER,
  FORMS_NEEDING_REPRESENTATIVES,
  type ImpressumFieldKey,
  type LegalForm,
} from '../../services/legalApi';

/** Impressum fields that must be filled for the given legal form (mirrors the backend rule). */
export function requiredImpressumKeys(legalForm: LegalForm): Set<ImpressumFieldKey> {
  const keys = new Set<ImpressumFieldKey>(BASE_REQUIRED_IMPRESSUM_KEYS);
  if (FORMS_NEEDING_REPRESENTATIVES.includes(legalForm)) keys.add('representatives');
  if (FORMS_NEEDING_REGISTER.includes(legalForm)) {
    keys.add('registerCourt');
    keys.add('registerNumber');
  }
  return keys;
}
