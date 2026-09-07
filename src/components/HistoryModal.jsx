import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { formatSeconds, formatSecondsShort, formatTimeOnlyBD, formatDateOnlyBD, formatDateTimeBD } from "../utils/formatters";

// ── Analytics full-page view ─────────────────────────────────────────────────
function AnalyticsPage({ router, onClose }) {
  const [period, setPeriod] = useState("1d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(p) {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await api.getAnalytics(router.ip_address, p);
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(period); }, [period]);

  const periods = [
    { label: "1 Day",  value: "1d" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days",value: "30d" },
  ];

  function fmt(seconds) {
    if (!seconds && seconds !== 0) return "—";
    const totalMinutes = Math.floor(seconds / 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0 && m === 0) return "0min";
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                📊 Analytics
              </span>
            </div>
            <h2 className="text-white font-bold text-lg">{router.bts_name}</h2>
            <span className="text-slate-400 text-sm font-mono">{router.ip_address}</span>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2 px-6 pt-5">
          {periods.map(p => (
            <button key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                period === p.value
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <svg className="w-8 h-8 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : data ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Up Time",       value: fmt(data.up_seconds),              color: "emerald" },
                  { label: "Down Time",     value: fmt(data.down_seconds),            color: "red"     },
                  { label: "Up Time %",     value: `${(data.uptime_pct ?? 0).toFixed(2)}%`,   color: "blue"    },
                  { label: "Down Time %",   value: `${(data.downtime_pct ?? 0).toFixed(2)}%`, color: "orange"  },
                  { label: "Total Hour",    value: fmt(data.period_seconds),          color: "cyan"    },
                  { label: "Monitored Time",value: fmt(data.monitored_seconds),       color: "violet"  },
                  { label: "Total Down",    value: data.down_incidents ?? "—",        color: "rose"    },
                  { label: "Time Period",   value: `${data.period_days ?? "—"} days`, color: "slate"   },
                ].map(s => (
                  <div key={s.label} className={`bg-slate-800/60 border border-slate-700/50 rounded-xl p-4`}>
                    <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</div>
                    <div className={`text-xl font-black text-${s.color}-400`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Full detail table */}
              {/* <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700/50">
                  <span className="text-white font-semibold text-sm">Full Analytics Details</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-semibold">BTS Name</th>
                      <th className="text-left px-4 py-3 font-semibold">IP Address</th>
                      <th className="text-left px-4 py-3 font-semibold">Time Period</th>
                      <th className="text-left px-4 py-3 font-semibold">Up Time</th>
                      <th className="text-left px-4 py-3 font-semibold">Down Time</th>
                      <th className="text-left px-4 py-3 font-semibold">Total Hour</th>
                      <th className="text-left px-4 py-3 font-semibold">Monitored Time</th>
                      <th className="text-left px-4 py-3 font-semibold">Up Time %</th>
                      <th className="text-left px-4 py-3 font-semibold">Down Time %</th>
                      <th className="text-left px-4 py-3 font-semibold">Total Down</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-4 text-white font-medium">{data.bts_name}</td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">{data.ip_address}</span>
                      </td>
                      <td className="px-4 py-4 text-slate-300">{data.period_days ?? "—"} days</td>
                      <td className="px-4 py-4 text-emerald-400 font-mono text-xs">{fmt(data.up_seconds)}</td>
                      <td className="px-4 py-4 text-red-400 font-mono text-xs">{fmt(data.down_seconds)}</td>
                      <td className="px-4 py-4 text-cyan-400 font-mono text-xs">{fmt(data.period_seconds)}</td>
                      <td className="px-4 py-4 text-violet-400 font-mono text-xs">{fmt(data.monitored_seconds)}</td>
                      <td className="px-4 py-4">
                        <span className="text-blue-400 font-bold">{(data.uptime_pct ?? 0).toFixed(2)}%</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-orange-400 font-bold">{(data.downtime_pct ?? 0).toFixed(2)}%</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 font-bold text-sm">
                          {data.down_incidents ?? "—"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div> */}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Main HistoryModal ─────────────────────────────────────────────────────────
export default function HistoryModal({ router, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("events"); // "events" | "full"
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const limit = 50;

  async function loadLastEvents() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getRouterLastEvents(router.ip_address);
      const records = data.cycles || data.data || data.records || data.events || (Array.isArray(data) ? data : []);
      setHistory(records);
      setMeta(null);
    } catch (e) {
      setError("Failed to load events: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFullHistory(p) {
    setLoading(true);
    setError("");
    try {
      const data = await api.getRouterHistory(router.ip_address, p, limit);
      const records = data.cycles || data.data || data.records || data.history || (Array.isArray(data) ? data : []);
      setHistory(records);
      setMeta({
        total: data.total || records.length,
        pages: data.pages || data.totalPages || 1,
        current: data.current_page || data.currentPage || p,
      });
    } catch (e) {
      setError("Failed to load history: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode === "events") loadLastEvents();
    else loadFullHistory(page);
  }, [mode, page]);

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest("#analytics-dropdown")) setAnalyticsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Show analytics full page on top
  if (showAnalytics) {
    return <AnalyticsPage router={router} onClose={() => setShowAnalytics(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-white font-bold text-lg">{router.bts_name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-slate-400 text-sm font-mono">{router.ip_address}</span>
              {mode === "full" && meta && (
                <span className="text-xs text-slate-500">{meta.total?.toLocaleString()} total records</span>
              )}
              {mode === "events" && !loading && (
                <span className="text-xs text-slate-500">{history.length} recent events</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Analytics button — opens full page */}
            <button
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-2 text-xs font-bold transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </button>

            {/* Mode toggle */}
            {mode === "events" ? (
              <button
                onClick={() => { setMode("full"); setPage(1); }}
                className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl px-4 py-2 text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                More History
              </button>
            ) : (
              <button
                onClick={() => { setMode("events"); setPage(1); setMeta(null); }}
                className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl px-4 py-2 text-xs font-bold transition-all"
              >
                ⚡ Last Events
              </button>
            )}

            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mode label */}
        <div className="px-6 pt-4 flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            mode === "events"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
          }`}>
            {mode === "events" ? "⚡ Last Events" : "📋 Full Ping History"}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <svg className="w-8 h-8 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : history.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No records found</div>
          ) : mode === "events" ? (
            // ── LAST EVENTS TABLE ──────────────────────────────────────────
            <div className="overflow-auto flex-1 mt-4" style={{ maxHeight: "calc(90vh - 280px)" }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="text-left pb-3 font-semibold pr-4">#</th>
                  <th className="text-left pb-3 font-semibold pr-4">Status</th>
                  <th className="text-left pb-3 font-semibold pr-4">Up Time</th>
                  <th className="text-left pb-3 font-semibold pr-4">Down Time</th>
                  <th className="text-left pb-3 font-semibold pr-4">Uptime 24h</th>
                  <th className="text-left pb-3 font-semibold pr-4">Downtime 24h</th>
                  <th className="text-left pb-3 font-semibold pr-4">Duration</th>
                  <th className="text-left pb-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.map((h, i) => {
                  // Duration: only show start time for last (most recent) cycle, start–end for others
                  const isLastCycle = i === 0;
                  let duration = "—";
                  if (isLastCycle && h.started_at) {
                    duration = `${formatTimeOnlyBD(h.started_at)} –`;
                  } else if (h.started_at && h.ended_at) {
                    duration = `${formatTimeOnlyBD(h.started_at)} – ${formatTimeOnlyBD(h.ended_at)}`;
                  } else if (h.started_at) {
                    duration = `${formatTimeOnlyBD(h.started_at)} –`;
                  }
                  return (
                    <tr key={h.id || i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 text-slate-500 font-mono text-xs pr-4">{i + 1}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          h.status === "Up"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/15 text-red-400 border border-red-500/20"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${h.status === "Up" ? "bg-emerald-400" : "bg-red-400"}`} />
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3 text-emerald-400/80 font-mono text-xs pr-4">{formatSeconds(h.up_time)}</td>
                      <td className="py-3 text-red-400/80 font-mono text-xs pr-4">{formatSeconds(h.down_time)}</td>
                      <td className="py-3 text-teal-400/80 font-mono text-xs pr-4">{formatSeconds(h.up_time_last_24h)}</td>
                      <td className="py-3 text-orange-400/80 font-mono text-xs pr-4">{formatSeconds(h.down_time_last_24h)}</td>
                      <td className="py-3 text-slate-300 text-xs font-mono pr-4">{duration}</td>
                      <td className="py-3 text-slate-400 text-xs">
                        {formatDateOnlyBD(h.checked_at || h.started_at || h.recorded_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          ) : (
            // ── MORE HISTORY TABLE ─────────────────────────────────────────
            <div className="overflow-auto flex-1 mt-4" style={{ maxHeight: "calc(90vh - 280px)" }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="text-left pb-3 font-semibold pr-4">#</th>
                  <th className="text-left pb-3 font-semibold pr-4">Status</th>
                  <th className="text-left pb-3 font-semibold pr-4">Up Time</th>
                  <th className="text-left pb-3 font-semibold pr-4">Down Time</th>
                  <th className="text-left pb-3 font-semibold pr-4">Uptime 24h</th>
                  <th className="text-left pb-3 font-semibold pr-4">Downtime 24h</th>
                  <th className="text-left pb-3 font-semibold pr-4">Countdown</th>
                  <th className="text-left pb-3 font-semibold">Date and Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.map((h, i) => (
                  <tr key={h.id || i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 text-slate-500 font-mono text-xs pr-4">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        h.status === "Up"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/15 text-red-400 border border-red-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${h.status === "Up" ? "bg-emerald-400" : "bg-red-400"}`} />
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3 text-emerald-400/80 font-mono text-xs pr-4">{formatSeconds(h.up_time)}</td>
                    <td className="py-3 text-red-400/80 font-mono text-xs pr-4">{formatSeconds(h.down_time)}</td>
                    <td className="py-3 text-teal-400/80 font-mono text-xs pr-4">{formatSeconds(h.up_time_last_24h)}</td>
                    <td className="py-3 text-orange-400/80 font-mono text-xs pr-4">{formatSeconds(h.down_time_last_24h)}</td>
                    <td className="py-3 text-red-400/80 font-mono text-xs pr-4">{h.countdown}</td>
                    <td className="py-3 text-slate-400 text-xs font-mono">
                      {formatDateTimeBD(h.checked_at || h.recorded_at || h.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Pagination — full mode only */}
        {mode === "full" && meta && meta.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
            <span className="text-slate-400 text-sm">Page {meta.current} of {meta.pages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page >= meta.pages}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}