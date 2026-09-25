import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetAuditEntriesQuery } from '../services/api';
import type { AuditEntry } from '../services/api';
import { MyCard } from '../components/ui/MyCard';
import { MySpinner } from '../components/ui/MySpinner';
import { MyButton } from '../components/ui/MyButton';

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ActivityRowProps {
  entry: AuditEntry;
  actorLabel: string;
}

function ActivityRow({ entry, actorLabel }: ActivityRowProps) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-col gap-0.5 text-sm">
        <span className="text-gray-900">
          <span className="font-medium">{actorLabel}</span> &middot; {entry.action} &middot; {entry.entityName}
        </span>
        <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
      </div>
    </div>
  );
}

export function ActivityPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pagedShopId, setPagedShopId] = useState(shopId);

  if (shopId !== pagedShopId) {
    setPagedShopId(shopId);
    setPage(1);
  }

  const { data, isLoading, isError } = useGetAuditEntriesQuery({
    shopId: shopId!,
    page,
    pageSize: PAGE_SIZE,
  });

  if (isLoading) return <MySpinner label={t('activity.title')} />;
  if (isError) return <p className="text-red-500">{t('activity.loadError')}</p>;

  const entries = data?.entries ?? [];
  const actorLabels = data?.actorLabels ?? {};
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const showPagination = data ? data.total > PAGE_SIZE : false;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">{t('activity.title')}</h1>

      <MyCard>
        {entries.length === 0 ? (
          <p className="p-5 text-gray-400 text-sm">{t('activity.empty')}</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {entries.map((entry) => (
              <ActivityRow
                key={entry.id}
                entry={entry}
                actorLabel={actorLabels[`${entry.actorType}:${entry.actorId}`] ?? entry.actorId}
              />
            ))}
          </div>
        )}
      </MyCard>

      {showPagination && (
        <div className="flex items-center justify-between mt-4">
          <MyButton
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('orders.previousPage')}
          </MyButton>
          <span className="text-sm text-gray-500">
            {t('orders.pageInfo', { page, total: totalPages })}
          </span>
          <MyButton
            variant="secondary"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('orders.nextPage')}
          </MyButton>
        </div>
      )}
    </div>
  );
}
