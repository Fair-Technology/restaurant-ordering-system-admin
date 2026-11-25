import { CheckCircle, X, XCircle } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss?: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="max-w-sm bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-2 animate-fade-in"
        >
          {toast.type === 'success' ? (
            <CheckCircle size={16} className="text-green-500 shrink-0" />
          ) : (
            <XCircle size={16} className="text-red-500 shrink-0" />
          )}
          <span className={`text-sm ${toast.type === 'success' ? 'text-gray-900' : 'text-red-600'}`}>
            {toast.message}
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
              className="ml-1 shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
