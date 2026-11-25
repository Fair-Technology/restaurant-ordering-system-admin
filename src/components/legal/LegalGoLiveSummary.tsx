import { useTranslation } from 'react-i18next';
import type { LegalGoLiveSummaryData, LegalSectionKey } from '../../features/legal/legalSections';

export function LegalGoLiveSummary({ data, onSelectSection }: {
  data: LegalGoLiveSummaryData;
  onSelectSection: (key: LegalSectionKey) => void;
}) {
  const { t } = useTranslation();
  const { completeCount, total, missing } = data;
  const ready = completeCount === total;

  return (
    <div className="mb-4 rounded-2xl border border-line bg-white p-4">
      {ready ? (
        <p className="inline-block rounded-full bg-[#e4ecdf] px-3 py-1 text-sm font-semibold text-[#2f6b3a]">
          {t('legal.summary.ready')}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-bold text-ink">{t('legal.summary.title', { count: completeCount, total })}</p>
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < completeCount ? 'bg-[#2f6b3a]' : 'bg-[#e3d9ce]'}`} />
            ))}
          </div>
          <ul role="list" className="flex flex-wrap gap-x-5 gap-y-1">
            {missing.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="min-h-11 text-left text-sm font-medium text-ink underline md:min-h-0"
                  onClick={() => onSelectSection(item.key)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
