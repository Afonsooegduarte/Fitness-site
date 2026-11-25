import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,22,31,0.45)', display: 'flex', alignItems: 'flex-end', zIndex: 5 }} onClick={onClose}>
      <div className="p-sheet" role="dialog" aria-label={title} style={{ width: '100%', maxHeight: '86%', overflowY: 'auto', borderRadius: '22px 22px 0 0', padding: 16 }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 10 }}>
          <h3>{title}</h3>
          <span className="spacer" />
          <button className="icon-btn sm" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const PBtn = ({ children, onClick, disabled, ghost }: { children: ReactNode; onClick?: () => void; disabled?: boolean; ghost?: boolean }) => (
  <button
    className="btn"
    disabled={disabled}
    onClick={onClick}
    style={ghost ? { borderRadius: 12 } : { background: 'var(--app-primary)', borderColor: 'var(--app-primary)', color: '#fff', borderRadius: 12, width: '100%', height: 44 }}
  >
    {children}
  </button>
);
