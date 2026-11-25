import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { X, Check, ImagePlus, Trash2 } from 'lucide-react';
import { initials, readFileAsDataUrl, shrinkImage } from '../lib/utils';

/* ---------- Toasts ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast">
            <Check size={16} /> {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Modal e gaveta ---------- */
function useEsc(onClose: () => void) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
}

export function Modal({ title, onClose, children, footer, size }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'wide' | 'xwide' }) {
  useEsc(onClose);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ?? ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children, footer, actions }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; actions?: ReactNode }) {
  useEsc(onClose);
  return (
    <>
      <div className="drawer-back" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <span className="spacer" />
          {actions}
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </aside>
    </>
  );
}

/* ---------- Pequenos componentes ---------- */
export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small className="faint">{hint}</small>}
  </label>
);

export const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
);

const AV_COLORS = ['#1F5FBF', '#2E9E5B', '#D63A2F', '#B8860B', '#1E2A38', '#5B6B7F', '#0E7C86', '#8A4FBF'];
export const colorFor = (s: string) => AV_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];

export const Avatar = ({ name, size = 32, color }: { name: string; size?: number; color?: string }) => (
  <span className="avatar" style={{ width: size, height: size, background: color ?? colorFor(name), fontSize: size * 0.38 }} aria-hidden>
    {initials(name)}
  </span>
);

export const Empty = ({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) => (
  <div className="empty">
    {icon}
    <h4>{title}</h4>
    {text && <p className="small">{text}</p>}
    {action}
  </div>
);

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)} aria-pressed={value === o.id}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Botão que pede uma segunda confirmação no próprio botão, sem diálogos do browser.
export function ConfirmButton({ onConfirm, children, label = 'Confirmar', className = 'btn btn-danger btn-sm' }: { onConfirm: () => void; children: ReactNode; label?: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button className={className} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? label : children}
    </button>
  );
}

export function Popover({ trigger, children, open, setOpen, align = 'right' }: { trigger: ReactNode; children: ReactNode; open: boolean; setOpen: (v: boolean) => void; align?: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [open, setOpen]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger}
      {open && <div className="popover" style={align === 'left' ? { left: 0, right: 'auto' } : undefined}>{children}</div>}
    </div>
  );
}

export function ImagePicker({ value, onChange, size = 72, round = false }: { value: string; onChange: (v: string) => void; size?: number; round?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const isImg = value.startsWith('data:image') || value.startsWith('http');
  return (
    <div className="row">
      <div className="food-img" style={{ width: size, height: size, borderRadius: round ? '50%' : 8, fontSize: size * 0.5 }}>
        {isImg ? <img src={value} alt="" /> : value || <ImagePlus size={20} color="#7A8494" />}
      </div>
      <div className="stack-sm">
        <button type="button" className="btn btn-sm" onClick={() => input.current?.click()}>
          <ImagePlus size={15} /> {value ? 'Trocar imagem' : 'Adicionar imagem'}
        </button>
        {value && (
          <button type="button" className="btn btn-sm btn-ghost btn-danger" onClick={() => onChange('')}>
            <Trash2 size={15} /> Remover
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          onChange(await shrinkImage(await readFileAsDataUrl(f), 480));
          e.target.value = '';
        }}
      />
    </div>
  );
}

export const Stat = ({ label, value, hint, plate }: { label: string; value: ReactNode; hint?: ReactNode; plate?: string }) => (
  <div className="panel panel-pad">
    <div className="plate" style={{ ['--plate' as any]: plate ?? 'var(--line)' }}>
      <div className="faint">{label}</div>
      <div className="big-num mt-sm">{value}</div>
      {hint && <div className="faint mt-sm">{hint}</div>}
    </div>
  </div>
);

export function PageHead({ title, lead, actions, back }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode; back?: { label: string; to: string } }) {
  return (
    <div className="page-head">
      <div>
        {back && (
          <button className="back" onClick={() => (window.location.hash = back.to)}>
            ‹ {back.label}
          </button>
        )}
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
