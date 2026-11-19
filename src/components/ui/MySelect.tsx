import { type ReactNode, type SelectHTMLAttributes, useId } from 'react';

const BASE =
  'w-full border border-[#e3d9ce] rounded-[10px] bg-white text-ink ' +
  'px-3 py-2 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink ' +
  'disabled:bg-gray-50 disabled:text-gray-400 transition-all duration-150';

export interface SelectOption {
  value: string;
  label: string;
}

interface MySelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  children?: ReactNode;
}

export function MySelect({ label, options, children, className = '', ...props }: MySelectProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-[#4a413b]">
          {label}
        </label>
      )}
      <select className={`${BASE} ${className}`} {...props} id={id}>
        {children}
        {options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
