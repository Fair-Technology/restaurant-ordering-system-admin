import { useId, useRef, useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface Category {
  id?: string;
  name?: string;
}

interface CategoryPickerProps {
  label?: string;
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CategoryPicker({ label, categories, selectedIds, onChange }: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const selected = categories.filter((c) => c.id && selectedIds.includes(c.id));
  const remaining = categories.filter((c) => c.id && !selectedIds.includes(c.id));

  const add = (id: string) => { onChange([...selectedIds, id]); setOpen(false); };
  const remove = (id: string) => onChange(selectedIds.filter((s) => s !== id));

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={triggerId} className="text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* Trigger area */}
      <button
        id={triggerId}
        type="button"
        onClick={() => remaining.length > 0 && setOpen((v) => !v)}
        className={`w-full min-h-[38px] bg-white border rounded-lg px-3 py-2 text-left transition-all duration-150 flex flex-wrap items-center gap-1.5 ${
          open ? 'border-gray-400 ring-2 ring-gray-900/20' : 'border-gray-200 hover:border-gray-300'
        } ${remaining.length === 0 ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {selected.length === 0 && (
          <span className="text-sm text-gray-400 flex-1">
            {remaining.length === 0 ? '—' : 'Select categories…'}
          </span>
        )}

        {selected.map((cat) => (
          <span
            key={cat.id}
            className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs bg-gray-100 border border-gray-200 text-gray-700"
          >
            {cat.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(cat.id!); }}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              aria-label={`Remove ${cat.name}`}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        {remaining.length > 0 && (
          <span className="ml-auto pl-1 text-gray-400">
            <ChevronDown
              size={14}
              className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && remaining.length > 0 && (
        <div className="relative z-20">
          <div className="absolute top-0 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {remaining.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => add(cat.id!)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
