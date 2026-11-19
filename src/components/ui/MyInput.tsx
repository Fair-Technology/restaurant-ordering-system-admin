import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

const BASE =
  'w-full border border-[#e3d9ce] rounded-[10px] bg-white text-ink placeholder-[#a39890] ' +
  'px-3 py-2 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink ' +
  'disabled:bg-gray-50 disabled:text-gray-400 transition-all duration-150';

function describedBy(hintId: string | undefined, existing: string | undefined) {
  const ids = [existing, hintId].filter(Boolean).join(' ');
  return ids || undefined;
}

interface MyInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
}

export function MyInput({ label, hint, className = '', ...props }: MyInputProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-[#4a413b]">
          {label}
        </label>
      )}
      {hint && (
        <span id={hintId} className="text-xs text-muted">
          {hint}
        </span>
      )}
      <input
        className={`${BASE} ${className}`}
        {...props}
        id={id}
        aria-describedby={describedBy(hintId, props['aria-describedby'])}
      />
    </div>
  );
}

interface MyTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: ReactNode;
}

export function MyTextarea({ label, hint, className = '', ...props }: MyTextareaProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-[#4a413b]">
          {label}
        </label>
      )}
      {hint && (
        <span id={hintId} className="text-xs text-muted">
          {hint}
        </span>
      )}
      <textarea
        className={`${BASE} resize-none ${className}`}
        {...props}
        id={id}
        aria-describedby={describedBy(hintId, props['aria-describedby'])}
      />
    </div>
  );
}
