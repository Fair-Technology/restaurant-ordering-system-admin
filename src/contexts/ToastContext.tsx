import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastContextValue {
  /** Optional `durationMs` overrides the per-type default (success 3s, error 8s). */
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
