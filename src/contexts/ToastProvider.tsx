import { useCallback, useState } from 'react';
import { ToastContainer } from '../components/ui/Toast';
import { ToastContext, type ToastType } from './ToastContext';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Errors carry a reason worth reading, so they stay up longer than confirmations.
const DEFAULT_DURATION_MS: Record<ToastType, number> = { success: 3000, error: 8000 };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType, durationMs?: number) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), durationMs ?? DEFAULT_DURATION_MS[type]);
  }, [dismiss]);

  const success = useCallback((message: string, durationMs?: number) => addToast(message, 'success', durationMs), [addToast]);
  const error = useCallback((message: string, durationMs?: number) => addToast(message, 'error', durationMs), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
