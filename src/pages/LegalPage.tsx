import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { useGetShopByIdQuery } from '../services/api';
import {
  LEGAL_FORMS,
  LEGAL_TEXT_MAX_CHARS,
  MIN_LEGAL_TEXT_CHARS,
  useAcceptDpaMutation,
  useEraseCustomerMutation,
  useGetDpaDocumentQuery,
  useGetPlatformLegalQuery,
  useGetShopLegalQuery,
  useLazyGetShopDataExportQuery,
  useUpdateShopLegalMutation,
} from '../services/legalApi';
import type {
  ImpressumFieldKey,
  ImpressumFields,
  LegalForm,
  LegalLanguage,
  LegalSection,
  LegalTextDto,
  ShopLegalSettingsDto,
  UpdateShopLegalBody,
} from '../services/legalApi';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput, MyTextarea } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { useToast } from '../contexts/ToastContext';
import { buildCustomersCsv, buildOrdersCsv } from '../features/legal/exportCsv';

const IMPRESSUM_TEXT_FIELDS: ImpressumFieldKey[] = [
  'legalName', 'representatives', 'street', 'postcode', 'city', 'country', 'phone', 'email',
  'registerCourt', 'registerNumber', 'vatId', 'supervisoryAuthority',
];

const TERMS_GUIDE_COUNT = 6;
const WITHDRAWAL_GUIDE_COUNT = 4;

const SELECT_CLASS =
  'w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400';

function errorMessage(err: unknown, fallback: string): string {
  return (err as { data?: { error?: string } })?.data?.error ?? fallback;
}

function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function CardHeader({ title, complete }: { title: string; complete?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {complete !== undefined && (
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {complete ? t('legal.complete') : t('legal.incomplete')}
        </span>
      )}
    </div>
  );
}

function DraftBadge() {
  const { t } = useTranslation();
  return (
    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      {t('legal.draftBadge')}
    </span>
  );
}

function DocumentSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
      {sections.map((s) => (
        <div key={s.heading}>
          <h4 className="text-sm font-semibold text-gray-900">{s.heading}</h4>
          {s.paragraphs.map((p) => (
            <p key={p} className="text-sm text-gray-600 mt-1">{p}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── DPA ────────────────────────────────────────────────────────────────────

function DpaCard({ shopId, shopName, legal, lang }: {
  shopId: string;
  shopName: string;
  legal: ShopLegalSettingsDto;
  lang: LegalLanguage;
}) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [showDoc, setShowDoc] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { data: doc } = useGetDpaDocumentQuery({}, { skip: !showDoc });
  const { data: platform } = useGetPlatformLegalQuery();
  const [acceptDpa, { isLoading }] = useAcceptDpaMutation();

  const { accepted, currentVersion, currentIsDraft } = legal.dpa;
  const status = !accepted
    ? t('legal.dpaNotAccepted')
    : accepted.version === currentVersion
      ? t('legal.dpaAcceptedOn', {
          version: accepted.version,
          date: new Date(accepted.acceptedAt).toLocaleDateString(i18n.language),
        })
      : t('legal.dpaNewVersion', { version: currentVersion });
  const needsAcceptance = accepted?.version !== currentVersion;

  const handleAccept = async () => {
    try {
      await acceptDpa({ shopId, version: currentVersion }).unwrap();
      setConfirmed(false);
      toast.success(t('legal.saved'));
    } catch (err) {
      toast.error(errorMessage(err, t('legal.saveFailed')));
    }
  };

  return (
    <MyCard id="dpa">
      <CardHeader title={t('legal.dpaTitle')} complete={legal.completeness.dpa} />
      <div className="px-6 py-4 space-y-4">
        <p className="text-sm text-gray-500">{t('legal.dpaIntro')}</p>
        <p className="text-sm font-medium text-gray-900">{status}</p>
        {currentIsDraft && <DraftBadge />}
        <div>
          <MyButton type="button" variant="secondary" size="sm" onClick={() => setShowDoc((v) => !v)}>
            {showDoc ? t('legal.dpaHide') : t('legal.dpaRead')}
          </MyButton>
        </div>
        {showDoc && doc && <DocumentSections sections={doc.sections[lang]} />}
        {platform && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('legal.subProcessorsTitle')}</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
              {platform.subProcessors.map((sp) => (
                <li key={sp.id}>{sp.name} — {sp.purpose[lang]} ({sp.location[lang]})</li>
              ))}
            </ul>
          </div>
        )}
        {needsAcceptance &&
          (legal.callerIsOwner ? (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {t('legal.dpaConfirm', { name: shopName })}
              </label>
              <MyButton type="button" disabled={!confirmed || isLoading} onClick={handleAccept}>
                {isLoading ? t('legal.dpaAccepting') : t('legal.dpaAccept')}
              </MyButton>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('legal.dpaOwnerOnly')}</p>
          ))}
      </div>
    </MyCard>
  );
}

// ── Impressum ──────────────────────────────────────────────────────────────

function ImpressumCard({ shopId, legal, shopAddress }: {
  shopId: string;
  legal: ShopLegalSettingsDto;
  shopAddress: { street?: string; postcode?: string; city?: string; country?: string } | undefined;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateLegal, { isLoading }] = useUpdateShopLegalMutation();
  const [draft, setDraft] = useState<ImpressumFields | null>(null);
  const [taxDraft, setTaxDraft] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const loaded: ImpressumFields = legal.impressum ?? {
    legalName: '', legalForm: 'sole_trader', representatives: '',
    street: shopAddress?.street ?? '', postcode: shopAddress?.postcode ?? '',
    city: shopAddress?.city ?? '', country: shopAddress?.country ?? '',
    phone: '', email: '', registerCourt: '', registerNumber: '', vatId: '', supervisoryAuthority: '',
  };
  const value = draft ?? loaded;
  const taxNumber = taxDraft ?? legal.taxNumber;
  const set = (key: ImpressumFieldKey, v: string) => setDraft({ ...value, [key]: v });

  const handleSave = async () => {
    setServerError(null);
    try {
      await updateLegal({ shopId, body: { impressum: value, taxNumber: taxNumber.trim() } }).unwrap();
      toast.success(t('legal.saved'));
    } catch (err) {
      const message = errorMessage(err, t('legal.saveFailed'));
      setServerError(message);
      toast.error(message);
    }
  };

  const fieldInput = (key: ImpressumFieldKey) => (
    <MyInput
      key={key}
      label={t(`legal.f.${key}`)}
      type={key === 'email' ? 'email' : 'text'}
      maxLength={300}
      value={value[key]}
      onChange={(e) => set(key, e.target.value)}
    />
  );

  return (
    <MyCard id="impressum">
      <CardHeader title={t('legal.impressumTitle')} complete={legal.completeness.impressum} />
      <div className="px-6 py-4 space-y-4">
        <p className="text-sm text-gray-500">{t('legal.impressumHelp')}</p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">{t('legal.f.legalForm')}</label>
          <select
            className={SELECT_CLASS}
            value={value.legalForm}
            onChange={(e) => set('legalForm', e.target.value as LegalForm)}
          >
            {LEGAL_FORMS.map((f) => (
              <option key={f} value={f}>{t(`legal.form.${f}`)}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {IMPRESSUM_TEXT_FIELDS.map(fieldInput)}
          <div className="flex flex-col gap-1">
            <MyInput
              label={t('legal.taxNumber')}
              maxLength={30}
              value={taxNumber}
              onChange={(e) => setTaxDraft(e.target.value)}
            />
            <p className="text-xs text-gray-500">{t('legal.taxNumberHelp')}</p>
          </div>
        </div>
        {value.vatId.trim() === '' && taxNumber.trim() === '' && (
          <p className="text-sm text-amber-700">{t('legal.taxIdMissing')}</p>
        )}
        {legal.missingImpressumFields.length > 0 && (
          <p className="text-sm text-amber-700">
            {t('legal.impressumMissing', {
              fields: legal.missingImpressumFields.map((k) => t(`legal.f.${k}`)).join(', '),
            })}
          </p>
        )}
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <MyButton type="button" onClick={handleSave} disabled={isLoading}>
          {isLoading ? t('legal.saving') : t('legal.impressumSave')}
        </MyButton>
      </div>
    </MyCard>
  );
}

// ── Free-text documents ────────────────────────────────────────────────────

function TextEditor({ label, saved, max, minLength, onSave, saveLabel }: {
  label?: string;
  saved: LegalTextDto | null;
  max: number;
  minLength?: number;
  onSave: (text: string) => Promise<void>;
  saveLabel: string;
}) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const value = draft ?? saved?.text ?? '';
  const trimmedLength = value.trim().length;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(value);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <MyTextarea
        label={label}
        rows={12}
        maxLength={max}
        value={value}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>{t('legal.charCount', { count: value.length, max })}</span>
        {minLength !== undefined && trimmedLength < minLength && (
          <span className="text-amber-700">{t('legal.minLength', { min: minLength })}</span>
        )}
        {saved && (
          <span>
            {t('legal.revision', {
              revision: saved.revision,
              date: new Date(saved.updatedAt).toLocaleDateString(i18n.language),
            })}
          </span>
        )}
      </div>
      <MyButton type="button" onClick={handleSave} disabled={isSaving}>
        {isSaving ? t('legal.saving') : saveLabel}
      </MyButton>
    </div>
  );
}

function useSaveLegal(shopId: string) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateLegal] = useUpdateShopLegalMutation();
  return async (body: UpdateShopLegalBody) => {
    try {
      await updateLegal({ shopId, body }).unwrap();
      toast.success(t('legal.saved'));
    } catch (err) {
      toast.error(errorMessage(err, t('legal.saveFailed')));
    }
  };
}

function TextCard({ id, kind, title, complete, saved, guideCount, shopId }: {
  id: string;
  kind: 'terms' | 'withdrawal';
  title: string;
  complete: boolean;
  saved: LegalTextDto | null;
  guideCount: number;
  shopId: string;
}) {
  const { t } = useTranslation();
  const [showGuide, setShowGuide] = useState(false);
  const save = useSaveLegal(shopId);
  const guideKey = kind === 'terms' ? 'legal.termsGuide' : 'legal.withdrawalGuide';

  return (
    <MyCard id={id}>
      <CardHeader title={title} complete={complete} />
      <div className="px-6 py-4 space-y-4">
        <div>
          <button
            type="button"
            className="text-sm font-medium text-gray-700 underline"
            onClick={() => setShowGuide((v) => !v)}
          >
            {t('legal.showGuide')}
          </button>
          {showGuide && (
            <div className="mt-2 space-y-2">
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                {Array.from({ length: guideCount }, (_, i) => (
                  <li key={i}>{t(`${guideKey}.${i + 1}`)}</li>
                ))}
              </ul>
              <p className="text-xs text-gray-400">{t('legal.notLegalAdvice')}</p>
            </div>
          )}
        </div>
        <TextEditor
          saved={saved}
          max={LEGAL_TEXT_MAX_CHARS[kind]}
          minLength={MIN_LEGAL_TEXT_CHARS}
          saveLabel={t('legal.textSave')}
          onSave={(text) => save({ [kind]: text })}
        />
      </div>
    </MyCard>
  );
}

// ── Privacy ────────────────────────────────────────────────────────────────

function PrivacyCard({ shopId, slug, legal }: { shopId: string; slug: string; legal: ShopLegalSettingsDto }) {
  const { t } = useTranslation();
  const save = useSaveLegal(shopId);
  const base = import.meta.env.VITE_SHOP_BASE_URL ?? 'https://www.example.com';

  return (
    <MyCard id="privacy">
      <CardHeader title={t('legal.privacyTitle')} complete={legal.completeness.privacyNotice} />
      <div className="px-6 py-4 space-y-4">
        <p className="text-sm text-gray-500">{t('legal.privacyHelp')}</p>
        <DraftBadge />
        {!legal.completeness.impressum ? (
          <p className="text-sm text-amber-700">{t('legal.privacyUnavailable')}</p>
        ) : !legal.platformIdentityComplete ? (
          <p className="text-sm text-amber-700">{t('legal.privacyPlatformMissing')}</p>
        ) : (
          <a
            href={`${base}/shops/${slug}/legal/privacy`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-gray-900 underline"
          >
            {t('legal.viewOnStorefront')}
          </a>
        )}
        <TextEditor
          label={t('legal.privacyAddition')}
          saved={legal.privacyAddition}
          max={LEGAL_TEXT_MAX_CHARS.privacyAddition}
          saveLabel={t('legal.textSave')}
          onSave={(text) => save({ privacyAddition: text })}
        />
      </div>
    </MyCard>
  );
}

// ── Data export and erasure ────────────────────────────────────────────────

function DataCard({ shopId, slug, legal }: { shopId: string; slug: string; legal: ShopLegalSettingsDto }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [fetchExport] = useLazyGetShopDataExportQuery();
  const [eraseCustomer, { isLoading: isErasing }] = useEraseCustomerMutation();
  const [exporting, setExporting] = useState(false);
  const [email, setEmail] = useState('');

  const handleExport = async (kind: 'json' | 'orders' | 'customers') => {
    setExporting(true);
    try {
      const data = await fetchExport({ shopId }).unwrap();
      const day = new Date().toISOString().slice(0, 10);
      if (kind === 'json') {
        downloadFile(`${slug}-export-${day}.json`, JSON.stringify(data, null, 2), 'application/json');
      } else if (kind === 'orders') {
        downloadFile(`${slug}-orders-${day}.csv`, buildOrdersCsv(data), 'text/csv;charset=utf-8');
      } else {
        downloadFile(`${slug}-customers-${day}.csv`, buildCustomersCsv(data), 'text/csv;charset=utf-8');
      }
    } catch {
      toast.error(t('legal.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleErase = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!window.confirm(t('legal.eraseConfirm', { email: trimmed }))) return;
    try {
      const result = await eraseCustomer({ shopId, email: trimmed }).unwrap();
      toast.success(t('legal.eraseDone', { count: result.anonymisedOrderCount }));
      setEmail('');
    } catch (err) {
      toast.error(errorMessage(err, t('legal.eraseFailed')));
    }
  };

  return (
    <MyCard id="data">
      <CardHeader title={t('legal.dataTitle')} />
      <div className="px-6 py-4 space-y-6">
        {!legal.callerIsOwner ? (
          <p className="text-sm text-gray-500">{t('legal.ownerOnly')}</p>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{t('legal.dataHelp')}</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['json', 'legal.exportJson'],
                    ['orders', 'legal.exportOrders'],
                    ['customers', 'legal.exportCustomers'],
                  ] as const
                ).map(([kind, label]) => (
                  <MyButton
                    key={kind}
                    type="button"
                    variant="secondary"
                    disabled={exporting}
                    onClick={() => handleExport(kind)}
                  >
                    <Download size={14} className="mr-1.5" />
                    {t(label)}
                  </MyButton>
                ))}
              </div>
              {exporting && <p className="text-xs text-gray-400">{t('legal.exporting')}</p>}
            </div>
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">{t('legal.eraseTitle')}</h3>
              <p className="text-sm text-gray-500">{t('legal.eraseHelp')}</p>
              <MyInput
                label={t('legal.eraseEmail')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <MyButton type="button" variant="danger" disabled={isErasing || !email.trim()} onClick={handleErase}>
                {t('legal.eraseButton')}
              </MyButton>
            </div>
          </>
        )}
      </div>
    </MyCard>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export function LegalPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const { data: legal, isError } = useGetShopLegalQuery({ shopId: shopId! });
  const lang: LegalLanguage = i18n.language.startsWith('de') ? 'de' : 'en';

  useEffect(() => {
    if (!legal) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [legal]);

  if (isError) return <p className="p-6 text-sm text-red-600">{t('legal.loadError')}</p>;
  if (!legal || !shop) return <MySpinner label={t('legal.loading')} />;

  return (
    <div className="max-w-3xl mx-auto w-full p-6 space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{t('legal.title')}</h1>
      <DpaCard shopId={shopId!} shopName={shop.name ?? ''} legal={legal} lang={lang} />
      <ImpressumCard shopId={shopId!} legal={legal} shopAddress={shop.address} />
      <TextCard
        id="terms" kind="terms" title={t('legal.termsTitle')} shopId={shopId!}
        complete={legal.completeness.terms} saved={legal.terms} guideCount={TERMS_GUIDE_COUNT}
      />
      <TextCard
        id="withdrawal" kind="withdrawal" title={t('legal.withdrawalTitle')} shopId={shopId!}
        complete={legal.completeness.withdrawal} saved={legal.withdrawal} guideCount={WITHDRAWAL_GUIDE_COUNT}
      />
      <PrivacyCard shopId={shopId!} slug={shop.slug ?? ''} legal={legal} />
      <DataCard shopId={shopId!} slug={shop.slug ?? ''} legal={legal} />
    </div>
  );
}
