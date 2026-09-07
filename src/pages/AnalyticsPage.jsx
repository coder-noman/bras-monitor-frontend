import React, { useState, useEffect, useRef } from "react";
import logo from "../../assets/logo.svg";
import { api } from "../utils/api";
import { API_BASE_URL } from "../config/config";
import HistoryModal from "../components/HistoryModal";

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

export default function AnalyticsPage({ onBack }) {
  const [period, setPeriod] = useState("1d");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedRouter, setSelectedRouter] = useState(null); // for single BTS analytics modal
  const exportRef = useRef(null);

  async function load(p) {
    setLoading(true);
    setError("");
    try {
      const res = await api.getAllAnalytics(p);
      // Support array or { data: [] } shapes
      const arr = Array.isArray(res) ? res : res.data || res.routers || res.analytics || [];
      // Sort: highest down_seconds first, then lowest up_seconds
      const sorted = [...arr].sort((a, b) => {
        if ((b.down_seconds || 0) !== (a.down_seconds || 0))
          return (b.down_seconds || 0) - (a.down_seconds || 0);
        return (a.up_seconds || 0) - (b.up_seconds || 0);
      });
      setData(sorted);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(period); }, [period]);

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleExport(p) {
    setExportOpen(false);
    setExporting(true);
    try {
      const blob = await api.downloadExcel(p);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bts-analytics-${p}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  const periods = [
    { label: "1 Day",   value: "1d" },
    { label: "7 Days",  value: "7d" },
    { label: "30 Days", value: "30d" },
  ];

  const filtered = data.filter(r =>
    r.bts_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.ip_address?.includes(search)
  );

  return (
    <div className="min-h-screen bg-[#080c18] text-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#0a0e1a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-16 h-16 flex items-center justify-center">
              <img src={logo} alt="Logo" width={50} height={50} />
            </div>
            <div>
              <div className="text-base font-black tracking-tight" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                BTS PDB ANALYTICS
              </div>
              <div className="text-[10px] text-emerald-400 tracking-wider">PERFORMANCE OVERVIEW</div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search BTS or IP..."
                className="w-full bg-slate-800/60 border border-slate-700/50 text-white rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 placeholder-slate-500 transition-all"
              />
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Period selector */}
            {periods.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === p.value
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
                }`}>
                {p.label}
              </button>
            ))}

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen(o => !o)}
                disabled={exporting}
                className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-50"
              >
                {exporting ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                Export
                <svg className={`w-3 h-3 transition-transform ${exportOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-20 w-36 shadow-xl">
                  {[{ label: "1 Day", value: "1d" }, { label: "7 Days", value: "7d" }, { label: "30 Days", value: "30d" }].map(opt => (
                    <button key={opt.value} onClick={() => handleExport(opt.value)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Back button */}
            <button onClick={onBack}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl px-3 py-2 text-xs font-semibold transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Mobile search */}
        <div className="sm:hidden px-4 pt-4">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search BTS or IP..."
            className="w-full bg-slate-800/60 border border-slate-700/50 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none placeholder-slate-500" />
        </div>

        {/* Summary bar */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-emerald-400 font-bold">{filtered.length}</span> BTS
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">
              Period: <span className="text-white font-semibold">{periods.find(p => p.value === period)?.label}</span>
            </span>
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-slate-500 hover:text-white underline transition-colors">
              Clear search
            </button>
          )}
        </div>

        {/* Table */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <svg className="w-10 h-10 animate-spin text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p className="text-slate-400 text-sm">Loading analytics...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64 text-red-400 text-sm">{error}</div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 150px)" }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-800/90 backdrop-blur text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-semibold">#</th>
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
                  <tbody className="divide-y divide-slate-800/60">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-16 text-slate-500">
                          {search ? `No results for "${search}"` : "No analytics data available"}
                        </td>
                      </tr>
                    ) : filtered.map((r, i) => (
                      <tr key={r.ip_address || i}
                        onClick={() => setSelectedRouter(r)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group">
                        <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-white font-medium group-hover:text-emerald-400 transition-colors">
                            {r.bts_name}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">
                            {r.ip_address}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">{r.period_days ?? "—"} days</td>
                        <td className="px-4 py-3.5">
                          <span className="text-emerald-400 font-mono text-xs">{fmt(r.up_seconds)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-mono text-xs ${(r.down_seconds || 0) > 0 ? "text-red-400" : "text-slate-500"}`}>
                            {fmt(r.down_seconds)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-cyan-400/80 font-mono text-xs">{fmt(r.period_seconds)}</td>
                        <td className="px-4 py-3.5 text-violet-400/80 font-mono text-xs">{fmt(r.monitored_seconds)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-700 rounded-full h-1.5 w-16">
                              <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${Math.min(r.uptime_pct || 0, 100)}%` }} />
                            </div>
                            <span className="text-blue-400 font-bold text-xs w-12 text-right">
                              {(r.uptime_pct ?? 0).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-bold text-xs ${(r.downtime_pct || 0) > 10 ? "text-red-400" : (r.downtime_pct || 0) > 0 ? "text-orange-400" : "text-slate-500"}`}>
                            {(r.downtime_pct ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {(r.down_incidents || 0) > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 font-bold text-sm">
                              {r.down_incidents}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Single BTS analytics modal */}
      {selectedRouter && (
        <SingleBTSModal router={selectedRouter} period={period} onClose={() => setSelectedRouter(null)} />
      )}
    </div>
  );
}

// ── Single BTS analytics modal ────────────────────────────────────────────────
export function SingleBTSModal({ router, period, onClose }) {
  const [activePeriod, setActivePeriod] = useState(period);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

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

  useEffect(() => { load(activePeriod); }, [activePeriod]);

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

  if (showHistory) {
    return <HistoryModal router={router} onClose={() => setShowHistory(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-400 text-xs font-bold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                📊 Single BTS Analytics
              </span>
            </div>
            <h2 className="text-white font-bold text-lg">{router.bts_name}</h2>
            <span className="text-slate-400 text-sm font-mono">{router.ip_address}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl px-3 py-2 text-xs font-bold transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2 px-6 pt-5">
          {[{ label: "1 Day", value: "1d" }, { label: "7 Days", value: "7d" }, { label: "30 Days", value: "30d" }].map(p => (
            <button key={p.value} onClick={() => setActivePeriod(p.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activePeriod === p.value
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
            <div className="flex items-center justify-center h-40">
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
                  { label: "Up Time",        value: fmt(data.up_seconds),              color: "emerald" },
                  { label: "Down Time",      value: fmt(data.down_seconds),            color: "red"     },
                  { label: "Up Time %",      value: `${(data.uptime_pct ?? 0).toFixed(2)}%`,  color: "blue"    },
                  { label: "Down Time %",    value: `${(data.downtime_pct ?? 0).toFixed(2)}%`,color: "orange"  },
                  { label: "Total Hour",     value: fmt(data.period_seconds),          color: "cyan"    },
                  { label: "Monitored Time", value: fmt(data.monitored_seconds),       color: "violet"  },
                  { label: "Total Down",     value: data.down_incidents ?? "—",        color: "rose"    },
                  { label: "Time Period",    value: `${data.period_days ?? "—"} days`, color: "slate"   },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
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
                <div className="overflow-x-auto">
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
                </div>
              </div> */}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
