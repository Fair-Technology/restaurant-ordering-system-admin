import { type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const BASE =
  'w-full border border-[#e3d9ce] rounded-[10px] bg-white text-ink placeholder-[#a39890] ' +
  'px-3 py-2 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink ' +
  'disabled:bg-gray-50 disabled:text-gray-400 transition-all duration-150';

interface MyInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function MyInput({ label, className = '', ...props }: MyInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-semibold text-[#4a413b]">{label}</label>
      )}
      <input className={`${BASE} ${className}`} {...props} />
    </div>
  );
}

interface MyTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function MyTextarea({ label, className = '', ...props }: MyTextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-semibold text-[#4a413b]">{label}</label>
      )}
      <textarea className={`${BASE} resize-none ${className}`} {...props} />
    </div>
  );
}
