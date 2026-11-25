import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Mic, Square, X } from 'lucide-react';

/* ---------- Fotos ---------- */

// Reduz a foto para caber no armazenamento do browser (cerca de 60 a 120 KB cada).
export function compressImage(file: File, maxSide = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagem inválida'));
    };
    img.src = url;
  });
}

export function PhotoPicker({ value, onChange, max = 6, color }: { value: string[]; onChange: (v: string[]) => void; max?: number; color?: string }) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, max - value.length)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        out.push(await compressImage(f));
      } catch {
        setError('Não foi possível ler uma das fotos.');
      }
    }
    if (files.length > max - value.length) setError(`Máximo de ${max} fotos.`);
    onChange([...value, ...out]);
    setBusy(false);
  };
  const full = value.length >= max;
  return (
    <div className="stack-sm">
      {value.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {value.map((src, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'var(--surface-3)' }}>
              <img src={src} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button
                type="button"
                aria-label={`Remover foto ${i + 1}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, border: 0, background: 'rgba(0,0,0,.6)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button type="button" className="btn btn-sm" disabled={full || busy} onClick={() => camRef.current?.click()} style={{ flex: 1, borderRadius: 10 }}>
          <Camera size={15} color={color} /> Tirar foto
        </button>
        <button type="button" className="btn btn-sm" disabled={full || busy} onClick={() => galRef.current?.click()} style={{ flex: 1, borderRadius: 10 }}>
          <ImagePlus size={15} color={color} /> Da galeria
        </button>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      <span className="faint small">{busy ? 'A preparar as fotos…' : error || `${value.length} de ${max} fotos`}</span>
    </div>
  );
}

/* ---------- Ditado por voz (Web Speech API) ---------- */

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

const getRecognition = (): (new () => Rec) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const canDictate = () => !!getRecognition();

const join = (a: string, b: string) => (!a.trim() ? b : !b ? a : a.replace(/\s+$/, '') + ' ' + b);

// Botão de microfone: enquanto está a ouvir, o texto ditado vai sendo acrescentado ao que já estava escrito.
export function DictateButton({ value, onChange, color = 'var(--app-primary, var(--blue))', compact }: { value: string; onChange: (v: string) => void; color?: string; compact?: boolean }) {
  const [listening, setListening] = useState(false);
  const [msg, setMsg] = useState('');
  const recRef = useRef<Rec | null>(null);
  const baseRef = useRef('');
  const finalRef = useRef('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => () => recRef.current?.stop(), []);

  const Recognition = getRecognition();
  if (!Recognition) {
    if (compact) return null;
    return (
      <span className="faint small" title="Este browser não tem ditado. No telemóvel, usa o microfone do teclado.">
        <Mic size={13} style={{ verticalAlign: -2 }} /> Ditado indisponível neste browser; usa o microfone do teclado.
      </span>
    );
  }

  const start = () => {
    const r = new Recognition();
    r.lang = 'pt-PT';
    r.continuous = true;
    r.interimResults = true;
    baseRef.current = value;
    finalRef.current = '';
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) finalRef.current = join(finalRef.current, t);
        else interim = join(interim, t);
      }
      onChangeRef.current(join(baseRef.current, join(finalRef.current, interim)));
    };
    r.onerror = (e: any) => {
      const code = e?.error;
      setMsg(
        code === 'not-allowed' || code === 'service-not-allowed'
          ? 'Sem acesso ao microfone. Dá permissão no browser.'
          : code === 'no-speech'
            ? 'Não ouvi nada. Tenta outra vez.'
            : code === 'network'
              ? 'O ditado precisa de internet.'
              : 'O ditado parou.',
      );
    };
    r.onend = () => {
      setListening(false);
      onChangeRef.current(join(baseRef.current, finalRef.current));
    };
    try {
      r.start();
      recRef.current = r;
      setMsg('');
      setListening(true);
    } catch {
      setMsg('Não foi possível ligar o microfone.');
    }
  };

  const stop = () => recRef.current?.stop();

  return (
    <span className="row" style={{ gap: 8, alignItems: 'center' }}>
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        aria-label={listening ? 'Parar ditado' : 'Ditar por voz'}
        title={listening ? 'Parar ditado' : 'Ditar por voz'}
        className={compact ? 'btn' : 'btn btn-sm'}
        style={{
          borderRadius: 20,
          background: listening ? '#E03131' : 'var(--paper)',
          borderColor: listening ? '#E03131' : undefined,
          color: listening ? '#fff' : undefined,
          animation: listening ? 'pulso-mic 1.2s ease-in-out infinite' : undefined,
        }}
      >
        {listening ? <Square size={13} /> : <Mic size={15} color={color} />}
        {compact ? (listening ? 'A ouvir…' : '') : listening ? 'A ouvir… toca para parar' : 'Ditar'}
      </button>
      {msg && <span className="small" style={{ color: '#C92A2A' }}>{msg}</span>}
      <style>{'@keyframes pulso-mic{0%,100%{box-shadow:0 0 0 0 rgba(224,49,49,.45)}50%{box-shadow:0 0 0 6px rgba(224,49,49,0)}}'}</style>
    </span>
  );
}
