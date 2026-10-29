import { formatINRShort } from "@/lib/format";

export interface Series {
  name: string;
  color: string; // CSS color / var(--x)
  values: number[];
}

const W = 640;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

/** Grouped vertical bars, one group per label. Pure SVG, scales to its container. */
export function BarChart({
  labels,
  series,
  height = 220,
  format = formatINRShort,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  format?: (n: number) => string;
}) {
  const padL = 46;
  const padB = 24;
  const padT = 8;
  const innerW = W - padL - 8;
  const innerH = height - padB - padT;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const groupW = innerW / Math.max(1, labels.length);
  const barW = Math.min(26, (groupW * 0.72) / Math.max(1, series.length));
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Bar chart">
        {ticks.map((t) => {
          const y = padT + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="var(--line)" strokeWidth={1} />
              <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="var(--muted)">
                {format(max * t)}
              </text>
            </g>
          );
        })}
        {labels.map((label, i) => {
          const gx = padL + i * groupW + (groupW - barW * series.length) / 2;
          return (
            <g key={label + i}>
              {series.map((s, j) => {
                const v = s.values[i] ?? 0;
                const h = (Math.max(0, v) / max) * innerH;
                return (
                  <rect key={s.name} x={gx + j * barW} y={padT + innerH - h} width={barW - 2} height={h} rx={2} fill={s.color}>
                    <title>{`${label} · ${s.name}: ${format(v)}`}</title>
                  </rect>
                );
              })}
              <text x={padL + i * groupW + groupW / 2} y={height - 7} textAnchor="middle" fontSize={10} fill="var(--muted)">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {series.length > 1 && <Legend series={series} />}
    </div>
  );
}

/** Line/area chart with an optional horizontal reference line (e.g. the net cost for payback). */
export function LineChart({
  labels,
  series,
  height = 220,
  hline,
  format = formatINRShort,
  labelEvery = 5,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  hline?: { value: number; label: string; color?: string };
  format?: (n: number) => string;
  labelEvery?: number;
}) {
  const padL = 52;
  const padB = 24;
  const padT = 10;
  const innerW = W - padL - 12;
  const innerH = height - padB - padT;
  const max = niceMax(Math.max(hline?.value ?? 0, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Line chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 12} y1={padT + innerH * (1 - t)} y2={padT + innerH * (1 - t)} stroke="var(--line)" />
            <text x={padL - 6} y={padT + innerH * (1 - t) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted)">
              {format(max * t)}
            </text>
          </g>
        ))}
        {hline && (
          <g>
            <line x1={padL} x2={W - 12} y1={y(hline.value)} y2={y(hline.value)} stroke={hline.color ?? "var(--sun)"} strokeDasharray="5 4" strokeWidth={1.5} />
            <text x={W - 14} y={y(hline.value) - 5} textAnchor="end" fontSize={10} fill={hline.color ?? "var(--sun)"}>
              {hline.label}
            </text>
          </g>
        )}
        {series.map((s) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          const area = `${x(0)},${y(0)} ${pts} ${x(s.values.length - 1)},${y(0)}`;
          return (
            <g key={s.name}>
              <polygon points={area} fill={s.color} opacity={0.12} />
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" />
            </g>
          );
        })}
        {labels.map((l, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={l + i} x={x(i)} y={height - 7} textAnchor="middle" fontSize={10} fill="var(--muted)">
              {l}
            </text>
          ) : null,
        )}
      </svg>
      {series.length > 1 && <Legend series={series} />}
    </div>
  );
}

/** Horizontal share bars, e.g. cost by category. */
export function HBars({
  rows,
  format = formatINRShort,
  color = "var(--brand)",
}: {
  rows: { label: string; value: number }[];
  format?: (n: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-ink">{r.label}</span>
            <span className="font-medium tabular-nums">{format(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
      {rows.length === 0 && <li className="text-sm text-muted">Nothing to show yet.</li>}
    </ul>
  );
}
