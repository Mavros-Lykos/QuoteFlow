import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

/* ---------- Button ---------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  block,
  loading,
  className = '',
  children,
  disabled,
  ...rest
}) => (
  <button
    type="button"
    {...rest}
    disabled={disabled || loading}
    className={`btn btn--${variant} ${size === 'lg' ? 'btn--lg' : ''} ${block ? 'btn--block' : ''} ${className}`}
  >
    {loading && <Loader2 size={18} className="spin" aria-hidden />}
    {children}
  </button>
);

/* ---------- Field ---------- */

export const Field: React.FC<{
  label: string;
  htmlFor: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, optional, children }) => (
  <div className="field">
    <label htmlFor={htmlFor} className="field__label">
      {label}
      {optional && <span className="field__opt"> optional</span>}
    </label>
    {children}
    {hint && <p className="field__hint">{hint}</p>}
  </div>
);

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`seg__item ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Sheet (bottom sheet on phones, dialog on desktop) ---------- */

export const Sheet: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, title, onClose, children, footer }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sheet__grab" aria-hidden />
        <div className="sheet__head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>
  );
};

/* ---------- Toasts ---------- */

interface Toast {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            {t.kind === 'success' ? <CheckCircle2 size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

/* ---------- Misc ---------- */

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}> = ({ icon, title, text, action }) => (
  <div className="empty">
    <div className="empty__icon" aria-hidden>
      {icon}
    </div>
    <h3>{title}</h3>
    <p>{text}</p>
    {action}
  </div>
);

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}> = ({ title, subtitle, actions, back }) => (
  <header className="page-head">
    <div className="page-head__text">
      {back}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions && <div className="page-head__actions">{actions}</div>}
  </header>
);

export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const label =
    status === 'approved' ? 'Won' : status === 'sent' ? 'Sent' : status === 'lost' ? 'Lost' : 'Draft';
  return <span className={`pill pill--${status === 'approved' || status === 'sent' || status === 'lost' ? status : 'draft'}`}>{label}</span>;
};
