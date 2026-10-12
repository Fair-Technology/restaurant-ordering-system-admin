import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetAuditEntriesQuery } from '../services/api';
import type { AuditEntry } from '../services/api';
import { EmptyNote, PageHeader, Pager, Row, Section } from '../components/layout/Page';
import { MySpinner } from '../components/ui/MySpinner';

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
    <Row>
      <span
        aria-hidden="true"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sand text-xs font-bold text-[#4a413b]"
      >
        {actorLabel.charAt(0).toUpperCase() || '?'}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="break-words">
          <span className="font-bold">{actorLabel}</span> <span className="text-[#4a413b]">&middot; {entry.action} &middot; {entry.entityName}</span>
        </p>
        <p className="mt-0.5 text-xs text-[#8a7f77]">{formatDate(entry.timestamp)}</p>
      </div>
    </Row>
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
  if (isError) return <p className="text-sm text-[#b42318]">{t('activity.loadError')}</p>;

  const entries = data?.entries ?? [];
  const actorLabels = data?.actorLabels ?? {};
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const showPagination = data ? data.total > PAGE_SIZE : false;

  return (
    <div>
      <PageHeader eyebrow={t('nav.group.business')} title={t('activity.title')} count={data ? t('activity.count', { count: data.total }) : undefined} />

      <Section title={t('activity.listTitle')}>
        {entries.length === 0 ? (
          <EmptyNote>{t('activity.empty')}</EmptyNote>
        ) : (
          entries.map((entry) => (
            <ActivityRow
              key={entry.id}
              entry={entry}
              actorLabel={actorLabels[`${entry.actorType}:${entry.actorId}`] ?? entry.actorId}
            />
          ))
        )}
      </Section>

      {showPagination && <Pager page={page} totalPages={totalPages} onPage={setPage} />}
    </div>
  );
}
