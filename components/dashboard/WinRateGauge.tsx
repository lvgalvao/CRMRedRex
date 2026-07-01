// Gauge circular de taxa de sucesso (won / (won+lost)) — estilo da referência.
export function WinRateGauge({ won, lost }: { won: number; lost: number }) {
  const total = won + lost;
  const pct = total > 0 ? Math.round((won / total) * 100) : 0;

  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#ECECE6" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#A3E635"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90"
          transform="rotate(90 60 60)"
          fontSize="22"
          fontWeight="800"
          fill="#1A1A1A"
        >
          {pct}%
        </text>
      </svg>
      <div>
        <p className="text-sm font-semibold">Taxa de sucesso</p>
        <p className="text-xs text-muted-foreground">
          {won} ganho(s) · {lost} perdido(s) no mês
        </p>
      </div>
    </div>
  );
}
