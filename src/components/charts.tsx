import { fmtDate, num } from '../lib/utils';

export function LineChart({ points, unit = '', height = 180, color = '#1F5FBF' }: { points: { date: string; v: number }[]; unit?: string; height?: number; color?: string }) {
  if (points.length < 2) return <p className="faint">Ainda não há medições suficientes para um gráfico.</p>;
  const W = 640;
  const H = height;
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const vs = points.map((p) => p.v);
  let min = Math.min(...vs);
  let max = Math.max(...vs);
  if (max - min < 1) {
    min -= 0.5;
    max += 0.5;
  }
  const span = max - min;
  min -= span * 0.1;
  max += span * 0.1;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const ticks = [min + (max - min) * 0.15, (min + max) / 2, max - (max - min) * 0.15];
  const every = Math.ceil(points.length / 6);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolução">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line-2)" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">
            {num(t)}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.v)} r={4} fill="var(--paper)" stroke={color} strokeWidth={2}>
            <title>{`${fmtDate(p.date, true)}: ${num(p.v)} ${unit}`}</title>
          </circle>
          {(i % every === 0 || i === points.length - 1) && (
            <text x={x(i)} y={H - 6} textAnchor="middle">
              {fmtDate(p.date)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function Sparkline({ values, color = '#1F5FBF', w = 90, h = 26 }: { values: number[]; color?: string; w?: number; h?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const s = max - min || 1;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 2 - ((v - min) / s) * (h - 4)).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Grelha de presenças (últimos N dias), cada célula é um dia.
export function AdherenceStrip({ dates, days = 28, color = '#2E9E5B', label = 'Registos diários' }: { dates: string[]; days?: number; color?: string; label?: string }) {
  const set = new Set(dates);
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, on: set.has(iso) };
  });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days}, 1fr)`, gap: 3 }} aria-label={label}>
      {cells.map((c) => (
        <span key={c.iso} title={fmtDate(c.iso)} style={{ height: 18, borderRadius: 3, background: c.on ? color : '#E8EBEF' }} />
      ))}
    </div>
  );
}

// Fotografia de progresso simulada (silhueta), para dados de exemplo sem imagens reais.
export function ProgressPhoto({ seed, slim = 0, label, pose = 'frente' }: { seed: string; slim?: number; label?: string; pose?: 'frente' | 'lado' | 'costas' }) {
  const hue = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 40;
  const w = 1 - Math.max(-0.25, Math.min(0.25, slim));
  const bodyW = pose === 'lado' ? 26 * w : 40 * w;
  return (
    <div className="ba-photo">
      <svg viewBox="0 0 120 160" width="100%" height="100%" aria-hidden>
        <defs>
          <linearGradient id={`bg${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`hsl(${205 + hue},16%,88%)`} />
            <stop offset="1" stopColor={`hsl(${205 + hue},14%,78%)`} />
          </linearGradient>
        </defs>
        <rect width="120" height="160" fill={`url(#bg${seed})`} />
        <g fill={`hsl(${210 + hue},14%,46%)`}>
          <circle cx="60" cy="30" r="12" />
          <rect x={60 - bodyW / 2} y="44" width={bodyW} height="58" rx={bodyW / 3} />
          <rect x={60 - bodyW / 2 + 2} y="96" width={bodyW / 2 - 3} height="58" rx="6" />
          <rect x={60 + 1} y="96" width={bodyW / 2 - 3} height="58" rx="6" />
          {pose !== 'lado' && (
            <>
              <rect x={60 - bodyW / 2 - 11} y="48" width="9" height="48" rx="4.5" />
              <rect x={60 + bodyW / 2 + 2} y="48" width="9" height="48" rx="4.5" />
            </>
          )}
        </g>
      </svg>
      {label && <span className="lbl">{label}</span>}
    </div>
  );
}
