import { X, CheckCircle2, XCircle, Info, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// Global toast queue
let toastQueue: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function notifyListeners() {
  listeners.forEach(listener => listener([...toastQueue]));
}

export function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') {
  const toastId = Date.now();
  const toast: Toast = { id: toastId, message, type };
  
  toastQueue.push(toast);
  notifyListeners();
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== toastId);
    notifyListeners();
  }, 5000);
}

export function CustomToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToasts(newToasts);
    };
    
    listeners.push(listener);
    
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  const removeToast = (id: number) => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    notifyListeners();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-green-600';
      case 'error':
        return 'bg-red-500 border-red-600';
      case 'warning':
        return 'bg-orange-500 border-orange-600';
      case 'info':
        return 'bg-blue-500 border-blue-600';
      default:
        return 'bg-blue-500 border-blue-600';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[99999] space-y-2 max-w-md">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${getStyles(toast.type)} text-white min-w-[320px] p-4 rounded-lg shadow-lg border-2 flex items-start gap-3 animate-in slide-in-from-right duration-300`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 pr-8">
            <p className="text-sm leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute top-3 right-3 hover:bg-white/20 rounded p-1 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Convenience methods
export const toast = {
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
  info: (message: string) => showToast(message, 'info'),
  warning: (message: string) => showToast(message, 'warning'),
};
