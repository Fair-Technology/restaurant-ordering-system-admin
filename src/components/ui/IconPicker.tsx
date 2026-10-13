import { useState, useRef } from 'react';
import {
  Flame, Leaf, Fish, Wheat, Droplets, Heart, Star, Snowflake,
  Zap, Shield, AlertTriangle, Coffee, Utensils, Wine, Beer,
  Cake, IceCream, Carrot, Cherry, Citrus, Egg, TreePine, Sun, Sandwich,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Flame, Leaf, Fish, Wheat, Droplets, Heart, Star, Snowflake,
  Zap, Shield, AlertTriangle, Coffee, Utensils, Wine, Beer,
  Cake, IceCream, Carrot, Cherry, Citrus, Egg, TreePine, Sun, Sandwich,
};

const ICON_NAMES = Object.keys(ICON_MAP);

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {ICON_NAMES.map((name) => {
        const Icon = ICON_MAP[name];
        const isSelected = value === name;
        return (
          <button
            key={name}
            type="button"
            title={name}
            onClick={() => onChange(name)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              isSelected
                ? 'bg-gray-900 text-white'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}

export function LucideIconByName({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={size} />;
}

export function IconPickerInline({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  };

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        type="button"
        title="Choose icon"
        onClick={handleOpen}
        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500"
      >
        {value ? <LucideIconByName name={value} size={18} /> : <span className="text-gray-300 text-xl leading-none">⊞</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-9" onClick={() => setOpen(false)} />
          <div
            className="fixed z-10 p-2 bg-white border border-gray-200 rounded-xl shadow-md w-56"
            style={{ top: pos.top, left: pos.left }}
          >
            <IconPicker
              value={value}
              onChange={(name) => {
                onChange(value === name ? null : name);
                setOpen(false);
              }}
            />
            {value && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); }}
                className="mt-1.5 w-full text-xs text-gray-400 hover:text-gray-700 text-center"
              >
                Remove icon
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
