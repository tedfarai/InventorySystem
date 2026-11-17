import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
  dismissOnClick?: boolean;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (
    title: string,
    type?: ToastType,
    message?: string,
    duration?: number,
    action?: ToastAction
  ) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      title: string,
      type: ToastType = 'info',
      message?: string,
      duration: number = 4000,
      action?: ToastAction
    ): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastMessage = { id, type, title, message, duration, action };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep max 5

      if (duration > 0) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id);
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const handleActionClick = async (toast: ToastMessage) => {
    if (!toast.action || runningActionId === toast.id) return;
    setRunningActionId(toast.id);
    try {
      await Promise.resolve(toast.action.onClick());
      if (toast.action.dismissOnClick !== false) {
        removeToast(toast.id);
      }
    } finally {
      setRunningActionId((prev) => (prev === toast.id ? null : prev));
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        id="global-toast-container"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isRunning = runningActionId === toast.id;

          const bgColor = isSuccess
            ? 'bg-emerald-900/95 border-emerald-500/60 text-emerald-100'
            : isError
            ? 'bg-rose-900/95 border-rose-500/60 text-rose-100'
            : isWarning
            ? 'bg-amber-900/95 border-amber-500/60 text-amber-100'
            : 'bg-slate-900/95 border-teal-500/60 text-slate-100';

          const iconColor = isSuccess
            ? 'text-emerald-400'
            : isError
            ? 'text-rose-400'
            : isWarning
            ? 'text-amber-400'
            : 'text-teal-400';

          const actionBtnColor = isWarning
            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            : isError
            ? 'bg-rose-400 hover:bg-rose-300 text-slate-950'
            : isSuccess
            ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
            : 'bg-teal-400 hover:bg-teal-300 text-slate-950';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl p-3.5 shadow-2xl border backdrop-blur-md transition-all duration-300 flex items-start space-x-3 transform translate-y-0 opacity-100 ${bgColor}`}
              role="alert"
            >
              <div className={`shrink-0 mt-0.5 ${iconColor}`}>
                {isSuccess && <CheckCircle2 className="w-5 h-5" />}
                {isError && <XCircle className="w-5 h-5" />}
                {isWarning && <AlertTriangle className="w-5 h-5" />}
                {toast.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-bold leading-tight tracking-tight">{toast.title}</p>
                {toast.message && (
                  <p className="text-[11px] opacity-90 mt-1 leading-snug font-normal text-slate-200">
                    {toast.message}
                  </p>
                )}
                {toast.action && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => handleActionClick(toast)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer disabled:opacity-60 ${actionBtnColor}`}
                    >
                      {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>{isRunning ? 'Running Backup...' : toast.action.label}</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
