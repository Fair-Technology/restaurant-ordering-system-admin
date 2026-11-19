import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Store, Package, Tag } from 'lucide-react';

interface Action {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export function FloatingActionButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { shopId } = useParams<{ shopId?: string }>();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  // A disclosure, not a modal: Escape just collapses it (no focus trap / focus return needed)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const actions: Action[] = [
    {
      label: t('fab.newShop'),
      icon: <Store size={15} />,
      onClick: () => { navigate('/shops?addShop=1'); setOpen(false); },
    },
    ...(shopId ? [
      {
        label: t('fab.newProduct'),
        icon: <Package size={15} />,
        onClick: () => { navigate(`/shops/${shopId}/products?addProduct=1`); setOpen(false); },
      },
      {
        label: t('fab.newCategory'),
        icon: <Tag size={15} />,
        onClick: () => { navigate(`/shops/${shopId}/categories?addCategory=1`); setOpen(false); },
      },
    ] : []),
  ];

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
      {/* Action items — slide up when open */}
      {open && (
        <div className="flex flex-col items-end gap-2 animate-fab-up">
          {[...actions].reverse().map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex items-center gap-2.5 pl-3 pr-4 py-2 bg-white border border-gray-200 rounded-full shadow-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-lg transition-all duration-150 whitespace-nowrap"
            >
              <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center flex-shrink-0">
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-13 h-13 rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 ${
          open ? 'rotate-45' : 'rotate-0'
        }`}
        style={{ width: 52, height: 52 }}
        aria-label={t('fab.quickActions')}
        aria-expanded={open}
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}
