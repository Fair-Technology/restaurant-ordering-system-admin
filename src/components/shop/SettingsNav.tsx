import { useEffect, useState } from 'react';
import { Chip, Toolbar } from '../layout/Page';

interface Props {
  label: string;
  items: { id: string; label: string }[];
}

/** Chips that jump to each area of the settings page; the chip of the area in view is dark. */
export function SettingsNav({ label, items }: Props) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  const ids = items.map((i) => i.id).join('|');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const order = ids.split('|');
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = order.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      // An area counts as "in view" while it crosses the upper part of the screen
      { rootMargin: '-80px 0px -55% 0px' },
    );
    for (const id of order) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Toolbar label={label}>
      {items.map((item) => (
        <Chip key={item.id} active={active === item.id} onClick={() => jump(item.id)}>
          {item.label}
        </Chip>
      ))}
    </Toolbar>
  );
}
