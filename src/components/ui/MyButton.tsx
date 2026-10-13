import { type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface MyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// Same family as the storefront: pill buttons, near-black primary, warm hairline borders
const variantClasses: Record<Variant, string> = {
  primary:   'bg-ink text-white hover:bg-black border border-ink',
  secondary: 'bg-white text-ink border border-[#e3d9ce] hover:bg-cream',
  ghost:     'bg-transparent text-[#4a413b] hover:bg-sand border border-transparent',
  danger:    'bg-white text-[#b42318] border border-[#f0c4ad] hover:bg-[#fdeceb]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-full',
  md: 'h-10 px-4 text-sm rounded-full',
  lg: 'h-11 px-5 text-sm rounded-full',
};

const BASE =
  'inline-flex items-center justify-center font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed';

export function MyButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: MyButtonProps) {
  return (
    <button
      className={`${BASE} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
