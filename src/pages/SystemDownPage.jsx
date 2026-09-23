import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../utils/api";
import { formatSeconds, formatDateTimeBD } from "../utils/formatters";

const REFRESH_INTERVAL = 30000;

// ── Status badge (handles "DOWN"/"UP" in any case) ──────────────────────────
function SaStatusBadge({ status }) {
  const isUp = String(status || "").toLowerCase() === "up";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
        isUp
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
          : "bg-red-500/15 text-red-400 border border-red-500/25"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isUp ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}
      />
      {status}
    </span>
  );
}

// ── Ask for sa_code (used by the top "History" button) ──────────────────────
function SaCodePromptModal({ onSubmit, onClose }) {
  const [code, setCode] = useState("");

  function submit() {
    const c = code.trim();
    if (c) onSubmit(c);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-white font-bold text-lg">SA History</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            SA Code
          </label>
          <input
            autoFocus
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. bras1"
            className="w-full bg-slate-800/60 border border-slate-700/50 text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 placeholder-slate-500 transition-all"
          />
          <button
            onClick={submit}
            disabled={!code.trim()}
            className="w-full mt-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Show History
          </button>
        </div>
      </div>
    </div>
  );
}

// ── System power events modal (/api/devices/:sa_code/system-power-events) ───
function SystemPowerEventsModal({ saCode, onClose }) {
  const [events, setEvents] = useState([]);
  const [saName, setSaName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const limit = 300;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await api.getSystemPowerEvents(saCode, page, limit);
        if (cancelled) return;
        const records = data.events || data.data || (Array.isArray(data) ? data : []);
        setEvents(records);
        setSaName(data.sa_name || records[0]?.sa_name || "");
        setMeta({
          total: data.total ?? records.length,
          pages: data.pages || 1,
          current: data.page || page,
        });
      } catch (e) {
        if (!cancelled) setError("Failed to load events: " + e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [saCode, page]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-white font-bold text-lg">{saName || saCode}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-slate-400 text-sm font-mono">{saCode}</span>
              {meta && (
                <span className="text-xs text-slate-500">
                  {meta.total?.toLocaleString()} total events
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode label */}
        <div className="px-6 pt-4 flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            ⚡ System Power Events
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <svg className="w-8 h-8 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : events.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No records found</div>
          ) : (
            <div className="overflow-auto flex-1 mt-4" style={{ maxHeight: "calc(90vh - 280px)" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="text-left pb-3 font-semibold pr-4">#</th>
                    <th className="text-left pb-3 font-semibold pr-4">SA Name</th>
                    <th className="text-left pb-3 font-semibold pr-4">SA Code</th>
                    <th className="text-left pb-3 font-semibold pr-4">Status</th>
                    <th className="text-left pb-3 font-semibold pr-4">Down Time</th>
                    <th className="text-left pb-3 font-semibold pr-4">Start Time</th>
                    <th className="text-left pb-3 font-semibold">End Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {events.map((h, i) => (
                    <tr key={h.id || i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 text-slate-500 font-mono text-xs pr-4">
                        {(page - 1) * limit + i + 1}
                      </td>
                      <td className="py-3 pr-4 text-white text-sm font-medium">{h.sa_name || "—"}</td>
                      <td className="py-3 pr-4">
                        <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">
                          {h.sa_code}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <SaStatusBadge status={h.status} />
                      </td>
                      <td className="py-3 text-red-400/80 font-mono text-xs pr-4">
                        {formatSeconds(h.down_time)}
                      </td>
                      <td className="py-3 text-slate-400 text-xs font-mono pr-4">
                        {formatDateTimeBD(h.start_time)}
                      </td>
                      <td className="py-3 text-slate-400 text-xs font-mono">
                        {formatDateTimeBD(h.end_time)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
            <span className="text-slate-400 text-sm">
              Page {meta.current} of {meta.pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SA System Monitoring page ───────────────────────────────────────────────
export default function SystemDownPage({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [promptOpen, setPromptOpen] = useState(false);
  const [historySa, setHistorySa] = useState(null); // sa_code string
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getSystemDown();
      const arr = Array.isArray(data) ? data : data.data || [];
      setRows(arr);
      setCountdown(30);
      setError("");
    } catch (e) {
      setError("API connection error: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchData]);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 30));
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // Highest downtime → lowest downtime
  const sorted = [...rows].sort((a, b) => (b.down_time || 0) - (a.down_time || 0));

  return (
    <div className="min-h-screen bg-[#080c18] text-white flex flex-col">
      {/* Top Nav */}
      <nav className="sticky top-0 z-40 bg-[#0a0e1a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              title="Back to dashboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              className="text-base font-black tracking-tight"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              SA SYSTEM MONITORING
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-1.5">
              <div className="relative w-3 h-3">
                <span className="absolute inset-0 rounded-full bg-cyan-500 animate-ping opacity-40" />
                <span className="relative block w-3 h-3 rounded-full bg-cyan-500" />
              </div>
              <span className="text-xs text-slate-400">
                Refresh in <span className="text-cyan-400 font-bold">{countdown}s</span>
              </span>
            </div>

            <button
              onClick={() => {
                fetchData();
                setCountdown(30);
              }}
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

            {/* History button — asks for sa_code */}
            <button
              onClick={() => setPromptOpen(true)}
              className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl px-4 py-2 text-xs font-bold transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              History
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6">
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-red-400 text-sm">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-sm">SA System Monitoring Table</span>
              <span className="text-xs text-slate-600">{sorted.length} total</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-slate-400 text-sm">Loading SA data...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto flex-1" style={{ maxHeight: "calc(100vh - 150px)" }}>
              <table className="w-full text-sm" style={{ minWidth: "700px" }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">#</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">SA Name</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">SA Code</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Down Time</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Start Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-500">
                        No SA is down right now
                      </td>
                    </tr>
                  ) : (
                    sorted.map((r, i) => (
                      <tr
                        key={r.sa_code || i}
                        onClick={() => setHistorySa(r.sa_code)}
                        className="cursor-pointer transition-colors hover:bg-slate-800/30 border-l-2 border-l-red-500/30"
                      >
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{i + 1}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-white font-medium text-sm leading-tight">{r.sa_name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">
                            {r.sa_code}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <SaStatusBadge status={r.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-red-400">{formatSeconds(r.down_time)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-slate-400">
                            {formatDateTimeBD(r.start_time)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {promptOpen && (
        <SaCodePromptModal
          onClose={() => setPromptOpen(false)}
          onSubmit={(code) => {
            setPromptOpen(false);
            setHistorySa(code);
          }}
        />
      )}

      {historySa && (
        <SystemPowerEventsModal saCode={historySa} onClose={() => setHistorySa(null)} />
      )}
    </div>
  );
}
