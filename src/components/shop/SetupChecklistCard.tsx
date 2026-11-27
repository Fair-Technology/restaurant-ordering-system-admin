import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { GetShopResultDto } from '../../services/api';
import { useGetGoLiveStatusQuery } from '../../services/api';
import { Section } from '../layout/Page';

/** Dashboard card: one line pointing at the go-live checklist page. */
export function SetupChecklistCard({ shop }: { shop: GetShopResultDto }) {
  const { t } = useTranslation();
  const shopId = shop.id!;
  const { data: status } = useGetGoLiveStatusQuery({ shopId });
  if (!status) return null;
  const open = status.criteria.filter((c) => !c.met).length;
  return (
    <Section padded>
      <Link to={`/shops/${shopId}/go-live`} className="text-sm font-semibold text-ink hover:underline">
        {open > 0 ? t('reports.setupChecklist.oneLiner', { count: open }) : t('reports.setupChecklist.ready')}
      </Link>
    </Section>
  );
}
