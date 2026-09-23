import React, { useState, useEffect, useCallback, useRef, useId } from "react";
import { api } from "../utils/api";
import { formatDateTimeBD } from "../utils/formatters";

const REFRESH_MS = 10000;

const GAUGE_RANGES = {
  // PDB voltage
  pdb: {
    max: 300,
    bands: [
      { from: 0, to: 160, color: "red" },
      { from: 160.01, to: 190, color: "yellow" },
      { from: 190.01, to: 250, color: "green" },
      { from: 250.01, to: 300, color: "red" },
    ],
  },

  // UPS 1 voltage
  ups1: {
    max: 300,
    bands: [
      { from: 0, to: 160, color: "red" },
      { from: 160.01, to: 190, color: "yellow" },
      { from: 190.01, to: 250, color: "green" },
      { from: 250.01, to: 300, color: "red" },
    ],
  },

  // Battery voltage (placeholder ranges — set your own)
  batt_volt: {
    max: 20,
    bands: [
      { from: 0, to: 11, color: "red" },
      { from: 11.01, to: 12, color: "yellow" },
      { from: 12.01, to: 20, color: "green" },
    ],
  },


  batt_curr: {
    max: 100,
    bands: [
      { from: 0, to: 60, color: "green" },
      { from: 60, to: 80, color: "yellow" },
      { from: 80, to: 100, color: "red" },
    ],
  },

  solar_volt: {
    max: 100,
    bands: [
      { from: 0, to: 20, color: "yellow" },
      { from: 20, to: 80, color: "green" },
      { from: 80, to: 100, color: "red" },
    ],
  },

  solar_curr: {
    max: 50,
    bands: [
      { from: 0, to: 30, color: "green" },
      { from: 30, to: 40, color: "yellow" },
      { from: 40, to: 50, color: "red" },
    ],
  },

  internal_batt: {
    max: 4.4,
    bands: [
      { from: 0, to: 3.4, color: "red" },
      { from: 3.5, to: 3.7, color: "yellow" },
      { from:   3.7, to: 4.4, color: "green" },
    ],
  },
};

const STATUS_OK_VALUE = 1;

const DECIMAL_PLACES = 2;
const GAUGES = [
  { range: "pdb", label: "PDB Voltage", unit: "V", decimal: false, names: ["pdb"] },
  { range: "ups1", label: "UPS 1 Voltage", unit: "V", decimal: false, names: ["ups1"] },
  { range: "batt_volt", label: "Battery Voltage", unit: "V", decimal: true, names: ["batt_volt_1", "batt_volt", "battery voltage"] },
  { range: "batt_curr", label: "Battery Current", unit: "A", decimal: true, names: ["batt_curr_1", "batt_curr", "battery current"] },
  { range: "solar_volt", label: "Solar Voltage", unit: "V", decimal: true, names: ["solar_volt", "solar voltage"] },
  { range: "solar_curr", label: "Solar Current", unit: "A", decimal: true, names: ["solar_curr", "solar current"] },
  { range: "internal_batt", label: "Internal Battery", unit: "V", decimal: true, names: ["internal_batt", "Internal Battery"] },
];

const COLORS = {
  green: { hex: "#10b981", label: "Normal" },
  yellow: { hex: "#f59e0b", label: "Warning" },
  red: { hex: "#ef4444", label: "Critical" },
};

const ICONS = {
  operator:
    "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0",
  signal: "M3 21h4V9H3v12zm7 0h4V3h-4v18zm7 0h4v-9h-4v9z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  counter: "M7 20l4-16m2 16l4-16M6 9h14M4 15h14",
  bolt: "M13 10V3L4 14h7v7l9-11h-7z",
  server:
    "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
};

function Icon({ name }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS[name]} />
    </svg>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

// Read a field from the API data, ignoring case / spaces / underscores
function pick(data, ...names) {
  if (!data) return null;
  const map = {};
  Object.keys(data).forEach((k) => {
    map[norm(k)] = data[k];
  });
  for (const n of names) {
    const v = map[norm(n)];
    if (v !== undefined) return v;
  }
  return null;
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// decimal -> 12.50 | whole number -> 140
function fmtValue(v, decimal) {
  const n = toNum(v);
  if (n === null) return "N/A";
  return decimal ? n.toFixed(DECIMAL_PLACES) : String(Math.round(n));
}

function bandColorFor(value, range) {
  const band = range.bands.find((b) => value >= b.from && value <= b.to);
  return band ? band.color : "red";
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function fmtDay(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}

function fmtClockSec(d) {
  try {
    return d.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function SectionTitle({ children }) {
  return <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">{children}</h2>;
}

// ── Gauge (ring, colour + status by range — like hams updateGauge) ──────────
function Gauge({ label, unit, value, range, decimal }) {
  const size = 130;
  const cx = size / 2;
  const r = 48;
  const c = 2 * Math.PI * r;
  const max = range.max > 0 ? range.max : 1;

  const n = toNum(value);
  const hasValue = n !== null;
  const colorKey = hasValue ? bandColorFor(n, range) : null;
  const color = colorKey ? COLORS[colorKey].hex : "#475569";
  const frac = hasValue ? Math.min(Math.max(n / max, 0), 1) : 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-2 py-3 flex flex-col items-center min-w-0">
      <div className="text-slate-400 text-xs font-medium mb-1 text-center leading-tight">{label}</div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[128px] h-auto">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${frac * c} ${c}`}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }}
        />
        <text x={cx} y={cx + 3} textAnchor="middle" fill="#f8fafc" fontSize={decimal ? 20 : 22} fontWeight="700">
          {fmtValue(value, decimal)}
        </text>
        <text x={cx} y={cx + 20} textAnchor="middle" fill="#94a3b8" fontSize="11">
          {hasValue ? unit : ""}
        </text>
      </svg>
      <div className="text-xs font-semibold" style={{ color }}>
        {hasValue ? COLORS[colorKey].label : "No Data"}
      </div>
      <div className="text-slate-600 text-[11px] mt-0.5 font-mono">
        0 – {max} {unit}
      </div>
    </div>
  );
}

// ── Grouped bar chart: Temperature + Humidity in ONE chart, ALL points ──────
// Fixed height; the width follows the card so every reading gets a slot.
const CHART_HEIGHT = 290; // <- chart height in px (make smaller / bigger here)
const MAX_BAR_WIDTH = 26; // <- pillar width in px (make thinner / thicker here)

// bar with rounded top corners only
function barPath(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

function EnvBarChart({ labels, series }) {
  const H = CHART_HEIGHT;
  const padL = 44;
  const padR = 16;
  const padT = 30;
  const padB = 46;
  const [hover, setHover] = useState(null);
  const [W, setW] = useState(900);
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const uid = useId().replace(/:/g, "");

  // keep the SVG 1:1 with the card width, so text and bars never get scaled
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setW(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // every reading in the response gets a slot, even if the arrays differ in length
  const n = Math.max(labels.length, ...series.map((s) => s.values.length));
  const nums = series.flatMap((s) => s.values).filter((v) => v !== null);
  const rawMax = nums.length ? Math.max(...nums) : 10;
  const yMax = Math.max(10, Math.ceil((rawMax * 1.15) / 10) * 10);

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const groupW = n > 0 ? innerW / n : innerW;
  const gap = 5; // space between the two bars of a reading
  const barW = Math.max(8, Math.min(MAX_BAR_WIDTH, (groupW - 16 - gap * (series.length - 1)) / series.length));
  const clusterW = barW * series.length + gap * (series.length - 1);
  const yAt = (v) => padT + (1 - v / yMax) * innerH;
  const yBase = padT + innerH;
  const showValues = groupW >= 64;
  const rotate = groupW < 40;

  const yTicks = Array.from({ length: 5 }, (_, i) => (yMax * i) / 4);

  // latest reading of each series (shown in the legend)
  const latest = (s) => {
    for (let i = s.values.length - 1; i >= 0; i -= 1) if (s.values[i] !== null && s.values[i] !== undefined) return s.values[i];
    return null;
  };

  function onMove(e) {
    if (!svgRef.current || n === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xv = e.clientX - rect.left;
    const idx = Math.floor((xv - padL) / groupW);
    setHover(idx >= 0 && idx < n ? idx : null);
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <div className="text-slate-100 text-base font-semibold">Temperature &amp; Humidity</div>
          <div className="text-slate-500 text-xs mt-0.5">Last {n} readings</div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {series.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5"
            >
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-slate-400 text-xs">{s.name}</span>
              <span className="text-white text-sm font-semibold">
                {fmtValue(latest(s), s.decimal)}
                <span className="text-slate-500 text-xs font-normal ml-0.5">{latest(s) === null ? "" : s.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div ref={wrapRef} className="w-full">
        {n === 0 ? (
          <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height: H }}>
            No chart data
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              {series.map((s, i) => (
                <linearGradient key={i} id={`${uid}-b${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.55" />
                </linearGradient>
              ))}
            </defs>

            {/* grid + y labels */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={yAt(t)}
                  y2={yAt(t)}
                  stroke={i === 0 ? "#334155" : "#1e293b"}
                  strokeWidth="1"
                  strokeDasharray={i === 0 ? "0" : "3 4"}
                />
                <text x={padL - 10} y={yAt(t) + 4} textAnchor="end" fill="#64748b" fontSize="11">
                  {Math.round(t)}
                </text>
              </g>
            ))}

            {/* hover highlight */}
            {hover !== null && (
              <rect x={padL + hover * groupW + 2} y={padT} width={groupW - 4} height={innerH} rx="6" fill="#94a3b8" fillOpacity="0.08" />
            )}

            {/* bars — every data point */}
            {Array.from({ length: n }, (_, i) => {
              const l = labels[i];
              const cxg = padL + i * groupW + groupW / 2;
              const gx = cxg - clusterW / 2;
              return (
                <g key={i}>
                  {series.map((s, si) => {
                    const v = s.values[i];
                    if (v === null || v === undefined) return null;
                    const bx = gx + si * (barW + gap);
                    const by = yAt(v);
                    return (
                      <g key={s.name}>
                        <path d={barPath(bx, by, barW, Math.max(yBase - by, 1), 5)} fill={`url(#${uid}-b${si})`} />
                        {showValues && (
                          <text x={bx + barW / 2} y={by - 6} textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="600">
                            {fmtValue(v, s.decimal)}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* x label: time (+ date) */}
                  {l &&
                    (rotate ? (
                      <text
                        transform={`translate(${cxg},${yBase + 14}) rotate(-50)`}
                        textAnchor="end"
                        fill="#64748b"
                        fontSize="10"
                      >
                        {fmtTime(l)}
                      </text>
                    ) : (
                      <>
                        <text x={cxg} y={yBase + 17} textAnchor="middle" fill="#94a3b8" fontSize="11">
                          {fmtTime(l)}
                        </text>
                        <text x={cxg} y={yBase + 31} textAnchor="middle" fill="#64748b" fontSize="10">
                          {fmtDay(l)}
                        </text>
                      </>
                    ))}
                </g>
              );
            })}

            {/* tooltip */}
            {hover !== null &&
              (() => {
                const boxW = 168;
                const boxH = 28 + series.length * 18;
                const cxg = padL + hover * groupW + groupW / 2;
                const bx = cxg > W / 2 ? cxg - boxW - groupW / 2 - 4 : cxg + groupW / 2 + 4;
                return (
                  <g>
                    <rect x={bx} y={padT} width={boxW} height={boxH} rx="8" fill="#0f172a" stroke="#334155" />
                    <text x={bx + 10} y={padT + 18} fill="#cbd5e1" fontSize="11">
                      {labels[hover] ? formatDateTimeBD(labels[hover]) : `Reading ${hover + 1}`}
                    </text>
                    {series.map((s, i) => (
                      <text key={s.name} x={bx + 10} y={padT + 38 + i * 18} fill={s.color} fontSize="12" fontWeight="600">
                        {s.name}: {s.values[hover] === null || s.values[hover] === undefined ? "N/A" : `${fmtValue(s.values[hover], s.decimal)} ${s.unit}`}
                      </text>
                    ))}
                  </g>
                );
              })()}
          </svg>
        )}
      </div>
    </div>
  );
}

// ── Device information component (label + value, hams device-wrapper-card) ──
function InfoCard({ icon, label, children, alert }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 flex items-center gap-3 bg-slate-900/60 ${
        alert ? "border-red-500/40" : "border-slate-800"
      }`}
    >
      <span className="w-9 h-9 shrink-0 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
        <Icon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-slate-500 text-xs">{label}</div>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function StatusText({ value }) {
  const v = toNum(value);
  if (v === null) return <span className="text-slate-500 text-base font-semibold">N/A</span>;
  const isOk = v === STATUS_OK_VALUE;
  return (
    <span className={`inline-flex items-center gap-2 text-base font-semibold ${isOk ? "text-emerald-400" : "text-red-400"}`}>
      <span className={`w-2 h-2 rounded-full ${isOk ? "bg-emerald-400" : "bg-red-400"}`} />
      {isOk ? "OK" : "Failed"}
    </span>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function DeviceDashboardPage({ router, onClose }) {
  const btsCode = router?.bts_code || "";
  const [data, setData] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(!!btsCode);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);

  const fetchData = useCallback(async () => {
    if (!btsCode) return;
    try {
      const res = await api.getLatestData(btsCode);
      if (res && res.success === false) throw new Error(res.message || "No data");
      if (!res || !res.data) throw new Error("No data found for this BTS code");
      setData(res.data);
      setCharts(res.charts || null);
      setUpdatedAt(new Date());
      setError("");
      setCountdown(REFRESH_MS / 1000);
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [btsCode]);

  // This page has its own scrollbar, so lock the page behind it (no double scrollbar)
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  useEffect(() => {
    if (!btsCode) return undefined;
    fetchData();
    const t = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(t);
  }, [btsCode, fetchData]);

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : REFRESH_MS / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // chart data — temperature + humidity together, every point
  const tempLabels = charts?.temperature?.labels || [];
  const humLabels = charts?.humidity?.labels || [];
  const chartLabels = tempLabels.length >= humLabels.length ? tempLabels : humLabels;
  const toSeries = (arr) => (arr || []).map(toNum);

  const psu1 = pick(data, "psu1");
  const psu2 = pick(data, "psu2");
  const server1 = pick(data, "server1");
  const server2 = pick(data, "server2");
  const isFailed = (v) => toNum(v) !== null && toNum(v) !== STATUS_OK_VALUE;
  const signal = toNum(pick(data, "signal_strength"));

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#080c18] text-white">
      {/* Top Nav */}
      <nav className="sticky top-0 z-40 bg-[#0a0e1a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="w-9 h-9 shrink-0 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              title="Back"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="text-base font-black tracking-tight truncate" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                DASHBOARD{router?.bts_name ? `: ${router.bts_name}` : ""}
              </div>
              {btsCode && <div className="text-xs text-slate-500 font-mono">{btsCode}</div>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {updatedAt && (
              <span className="hidden sm:inline text-xs text-slate-500">
                Updated {fmtClockSec(updatedAt)} · next in {countdown}s
              </span>
            )}
            <button
              onClick={fetchData}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-all"
              title="Refresh now"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        {!btsCode ? (
          <div className="text-center text-slate-500 py-24">
            This SA has no PDB Monitoring Device!
          </div>
        ) : loading && !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg className="w-9 h-9 animate-spin text-cyan-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-slate-400 text-sm">Loading device data...</p>
            </div>
          </div>
        ) : data ? (
          <>
            <section>
              <SectionTitle>Power</SectionTitle>
              <div className="overflow-x-auto pb-1">
                <div className="grid grid-cols-7 gap-3" style={{ minWidth: "880px" }}>
                  {GAUGES.map((g) => (
                    <Gauge
                      key={g.range}
                      label={g.label}
                      unit={g.unit}
                      decimal={g.decimal}
                      value={pick(data, ...g.names)}
                      range={GAUGE_RANGES[g.range]}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* One bar chart — temperature + humidity */}
            <section>
              <SectionTitle>Environment</SectionTitle>
              <EnvBarChart
                labels={chartLabels}
                series={[
                  { name: "Temperature", unit: "°C", decimal: true, color: "#fb923c", values: toSeries(charts?.temperature?.temp1) },
                  { name: "Humidity", unit: "%", decimal: false, color: "#38bdf8", values: toSeries(charts?.humidity?.hum1) },
                ]}
              />
            </section>

            {/* Device information — bottom of the page, one component per item */}
            <section>
              <SectionTitle>Device Information</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {/* Top row: PSU 1, PSU 2, Server 1, Server 2 */}
                <InfoCard icon="bolt" label="PSU 1" alert={isFailed(psu1)}>
                  <StatusText value={psu1} />
                </InfoCard>

                <InfoCard icon="bolt" label="PSU 2" alert={isFailed(psu2)}>
                  <StatusText value={psu2} />
                </InfoCard>

                <InfoCard icon="server" label="Server 1" alert={isFailed(server1)}>
                  <StatusText value={server1} />
                </InfoCard>

                <InfoCard icon="server" label="Server 2" alert={isFailed(server2)}>
                  <StatusText value={server2} />
                </InfoCard>

                {/* Bottom row: Operator, Signal Strength, Active Since, Data Counter */}
                <InfoCard icon="operator" label="Operator">
                  <div className="text-white text-base font-semibold">{pick(data, "operator") || "—"}</div>
                </InfoCard>

                <InfoCard icon="signal" label="Signal Strength">
                  <div className="text-white text-base font-semibold">
                    {signal === null ? "N/A" : `${Math.round(signal)} %`}
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-400 transition-all"
                      style={{ width: `${Math.min(Math.max(signal || 0, 0), 100)}%` }}
                    />
                  </div>
                </InfoCard>

                <InfoCard icon="calendar" label="Active Since">
                  <div className="text-white text-base font-semibold">{pick(data, "active") || "—"}</div>
                </InfoCard>

                <InfoCard icon="counter" label="Data Counter">
                  <div className="text-white text-base font-semibold">{fmtValue(pick(data, "data_counter"), false)}</div>
                </InfoCard>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}