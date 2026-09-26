import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { createContext, forwardRef, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean };
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', loading, disabled, children, className = '', ...props }, ref) {
  return <button ref={ref} className={`button button-${variant} ${className}`} disabled={disabled || loading} aria-busy={loading} {...props}>{loading && <LoaderCircle className="spin" aria-hidden="true" />}{children}</button>;
});

export function Alert({ children, tone = 'info' }: PropsWithChildren<{ tone?: 'info' | 'success' | 'warning' | 'error' }>) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon aria-hidden="true" /><div>{children}</div></div>;
}

export function Dialog({ open, title, description, confirmLabel = 'Xác nhận', danger, pending, onClose, onConfirm }: { open: boolean; title: string; description: ReactNode; confirmLabel?: string; danger?: boolean; pending?: boolean; onClose: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}><button className="icon-button dialog-close" aria-label="Đóng hộp thoại" onClick={onClose}><X /></button><span className={`dialog-icon ${danger ? 'danger' : ''}`}><AlertCircle /></span><h2 id="dialog-title">{title}</h2><div className="dialog-description">{description}</div><div className="dialog-actions"><Button ref={cancelRef} variant="secondary" onClick={onClose}>Hủy</Button><Button variant={danger ? 'danger' : 'primary'} loading={pending} onClick={onConfirm}>{confirmLabel}</Button></div></section></div>;
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="skeleton-list" role="status" aria-label="Đang tải dữ liệu">{Array.from({ length: rows }, (_, index) => <div className="skeleton-card" key={index}><i /><div><span /><span /><span /></div></div>)}</div>;
}

type ToastItem = { id: number; message: string; tone: 'success' | 'error' };
const ToastContext = createContext<{ push: (message: string, tone?: ToastItem['tone']) => void } | null>(null);
export function ToastProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = (message: string, tone: ToastItem['tone'] = 'success') => { const id = Date.now(); setItems(current => [...current, { id, message, tone }]); window.setTimeout(() => setItems(current => current.filter(item => item.id !== id)), 3500); };
  return <ToastContext.Provider value={{ push }}>{children}<div className="toast-region" aria-live="polite">{items.map(item => <div className={`toast toast-${item.tone}`} key={item.id}>{item.tone === 'success' ? <CheckCircle2 /> : <AlertCircle />}{item.message}<button aria-label="Đóng thông báo" onClick={() => setItems(current => current.filter(value => value.id !== item.id))}><X /></button></div>)}</div></ToastContext.Provider>;
}
export function useToast() { const value = useContext(ToastContext); if (!value) throw new Error('ToastProvider missing'); return value; }
