import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; iconColor: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    container: 'bg-surface text-dark-cocoa border-dark-cocoa/15',
    iconColor: 'text-pool-blue-deep',
    Icon: CheckCircle2,
  },
  info: {
    container: 'bg-pool-blue text-dark-cocoa border-dark-cocoa/15',
    iconColor: 'text-dark-cocoa',
    Icon: Info,
  },
  warning: {
    container: 'bg-warning-soft text-warning-ink border-warning-ink/25',
    iconColor: 'text-warning-ink',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-danger-soft text-danger-ink border-danger-ink/25',
    iconColor: 'text-danger-ink',
    Icon: AlertCircle,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextIdRef.current++;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);

      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, 4200);
      timersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          const IconComponent = style.Icon;
          return (
            <div
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 rounded-[var(--radius-card)] border px-4 py-3.5 shadow-cocoa-lg transition-all ${style.container}`}
            >
              <IconComponent
                aria-hidden="true"
                className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`}
              />
              <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Cerrar notificación"
                className="rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return ctx;
}
