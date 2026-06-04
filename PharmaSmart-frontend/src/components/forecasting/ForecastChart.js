import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

// ─── colour palette (matches the rest of the app) ──────────────────────────
const COLORS = {
  historical:  '#1B4965',
  prophet:     '#0B6E4F',
  xgboost:     '#E67E22',
  band:        'rgba(11,110,79,0.12)',
  bandStroke:  'rgba(11,110,79,0.35)',
  grid:        '#f0f0f0',
  today:       '#E74C3C',
};

// ─── legend renderer ────────────────────────────────────────────────────────
const LEGEND_ITEMS = [
  { color: COLORS.historical, label: 'Historique (30j)', dash: false },
  { color: COLORS.prophet,    label: 'Prophet',          dash: true  },
  { color: COLORS.xgboost,    label: 'XGBoost',          dash: false },
  { color: COLORS.band,       label: 'Intervalle 90 %',  band: true  },
];

function CustomLegend() {
  return (
    <div className="d-flex flex-wrap justify-content-center gap-3 mt-2" style={{ fontSize: 12 }}>
      {LEGEND_ITEMS.map(item => (
        <span key={item.label} className="d-flex align-items-center gap-1">
          {item.band ? (
            <span
              style={{
                display: 'inline-block', width: 28, height: 10,
                backgroundColor: COLORS.band,
                border: `1px solid ${COLORS.bandStroke}`,
                borderRadius: 2,
              }}
            />
          ) : (
            <svg width={28} height={10}>
              <line
                x1={0} y1={5} x2={28} y2={5}
                stroke={item.color}
                strokeWidth={2}
                strokeDasharray={item.dash ? '5 3' : undefined}
              />
            </svg>
          )}
          <span style={{ color: '#555' }}>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

// ─── custom tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const byKey = {};
  payload.forEach(p => { byKey[p.dataKey] = p.value; });

  const rows = [
    byKey.historical != null && { color: COLORS.historical, name: 'Historique', val: Math.round(byKey.historical) },
    byKey.prophet     != null && { color: COLORS.prophet,   name: 'Prophet',    val: byKey.prophet.toFixed(1)     },
    byKey.xgboost     != null && { color: COLORS.xgboost,   name: 'XGBoost',    val: byKey.xgboost.toFixed(1)     },
    byKey.prophet_low != null && byKey.prophet_band != null && {
      color: COLORS.bandStroke,
      name: 'IC 90 %',
      val: `${byKey.prophet_low.toFixed(0)} – ${(byKey.prophet_low + byKey.prophet_band).toFixed(0)}`,
    },
  ].filter(Boolean);

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        fontSize: 12,
        minWidth: 160,
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 6, color: '#333' }}>{label}</p>
      {rows.map(r => (
        <div key={r.name} className="d-flex justify-content-between gap-3">
          <span style={{ color: r.color, fontWeight: 600 }}>{r.name}</span>
          <span style={{ color: '#333' }}>{r.val} unités</span>
        </div>
      ))}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

/**
 * ForecastChart
 *
 * Expects `data` to be an array of objects shaped as:
 *   Historical region: { date, label, historical }
 *   Forecast region:   { date, label, prophet, prophet_low, prophet_band, xgboost }
 *
 * `todayLabel` is the formatted label string of today's date (for the reference line).
 */
export default function ForecastChart({ data, todayLabel, height = 320 }) {
  if (!data?.length) return null;

  // Only show every Nth tick to avoid crowding on the X axis
  const totalPoints = data.length;
  const interval = Math.max(1, Math.floor(totalPoints / 10));

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="gradHistorical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COLORS.historical} stopOpacity={0.15} />
              <stop offset="95%" stopColor={COLORS.historical} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#888' }}
            interval={interval}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#888' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => Math.round(v)}
            width={40}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* "Aujourd'hui" vertical marker */}
          {todayLabel && (
            <ReferenceLine
              x={todayLabel}
              stroke={COLORS.today}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: "Aujourd'hui",
                position: 'top',
                fill: COLORS.today,
                fontSize: 10,
                fontWeight: 700,
              }}
            />
          )}

          {/* Prophet confidence band (stacked area trick) */}
          <Area
            type="monotone"
            dataKey="prophet_low"
            stackId="ci"
            stroke="none"
            fill="transparent"
            connectNulls={false}
            legendType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="prophet_band"
            stackId="ci"
            stroke={COLORS.bandStroke}
            fill={COLORS.band}
            connectNulls={false}
            legendType="none"
            isAnimationActive={false}
          />

          {/* Historical area */}
          <Area
            type="monotone"
            dataKey="historical"
            stroke={COLORS.historical}
            strokeWidth={2}
            fill="url(#gradHistorical)"
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4 }}
            isAnimationActive={true}
            animationDuration={600}
          />

          {/* Prophet forecast line */}
          <Line
            type="monotone"
            dataKey="prophet"
            stroke={COLORS.prophet}
            strokeWidth={2.5}
            strokeDasharray="7 3"
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, fill: COLORS.prophet }}
            isAnimationActive={true}
            animationDuration={800}
          />

          {/* XGBoost forecast line */}
          <Line
            type="monotone"
            dataKey="xgboost"
            stroke={COLORS.xgboost}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, fill: COLORS.xgboost }}
            isAnimationActive={true}
            animationDuration={1000}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <CustomLegend />
    </>
  );
}
