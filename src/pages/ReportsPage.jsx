import React, { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "../config/config";
import logo from "../../assets/logo.svg";

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

function parseDateTime(value) {
  if (!value) return null;
  let v = value;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(v)) {
    // Normalize "YYYY-MM-DD HH:MM:SS" (no T/Z) into a real UTC ISO string
    v = v.replace(" ", "T") + (v.endsWith("Z") ? "" : "Z");
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatTimeOnlyBD(utcString) {
  const d = parseDateTime(utcString);
  if (!d) return "—";
  return d.toLocaleTimeString("en-BD", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatShortDateBD(utcString) {
  const d = parseDateTime(utcString);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function toDisplayDate(apiDate) {
  if (!apiDate) return "";
  try {
    return new Date(apiDate + "T00:00:00").toLocaleDateString("en-BD", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return apiDate;
  }
}

// Generic extractor: find the array of records inside any response shape
function extractArray(json) {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== "object") return [];
  const keys = [
    "days",
    "daily",
    "dates",
    "breakdown",
    "data",
    "results",
    "records",
    "analytics",
    "routers",
  ];
  for (const k of keys) {
    if (Array.isArray(json[k])) return json[k];
  }
  for (const v of Object.values(json)) {
    if (Array.isArray(v)) return v;
  }
  return [];
}

// Generic date-field getter for a per-day record
function getRecordDate(d) {
  return (
    d.summary_date ||
    d.date ||
    d.day ||
    d.report_date ||
    d.checked_date ||
    d.recorded_date ||
    d.checked_at ||
    null
  );
}

// ── Deep-dive modal — opened when a date-wise row is clicked ──
// Calls /api/analytics/date/{date}/{ip} and shows full summary + events, same style as single-date view
function DayDetailModal({ ip, date, btsName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleExportBts() {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics/date/${date}/${ip}/excel`);
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bts-report-${ip}-${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/analytics/date/${date}/${ip}`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ip, date]);

  const summary = data?.summary || data;
  const events = data?.events || data?.cycles || data?.history || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-indigo-700/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">

        <div className="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
          <div>
            <span className="text-indigo-400 text-xs font-bold px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-1.5 inline-block">
              🔎 Day Detail
            </span>
            <h2 className="text-white font-bold text-base">{btsName}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">{ip}</span>
              <span className="text-slate-500 text-xs">{toDisplayDate(date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBts}
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
            </button>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <svg className="w-8 h-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : (
            <>
              {summary && (
                <div className="flex flex-wrap gap-3 mb-5">
                  {[
                    { label: "Up Time",     value: fmt(summary.up_seconds ?? summary.up_time),     color: "emerald" },
                    { label: "Down Time",   value: fmt(summary.down_seconds ?? summary.down_time), color: "red"     },
                    { label: "Up Time %",   value: `${parseFloat(summary.uptime_pct ?? 0).toFixed(1)}%`,   color: "blue"    },
                    { label: "Down Time %", value: `${parseFloat(summary.downtime_pct ?? 0).toFixed(1)}%`, color: "orange"  },
                    { label: "Total Down",  value: summary.down_incidents ?? "—",                  color: "rose"    },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
                      <span className="text-slate-400 text-xs font-semibold">{s.label}</span>
                      <span className={`text-${s.color}-400 font-black text-sm`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {events.length > 0 ? (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-700/50 flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">Events</span>
                    <span className="text-slate-500 text-xs">{events.length} records</span>
                  </div>
                  <div className="overflow-auto" style={{ maxHeight: "calc(90vh - 320px)" }}>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">#</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Status</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Up Time</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Down Time</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Duration</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {events.map((h, i) => {
                          let duration = "—";
                          if (h.started_at && h.ended_at) {
                            duration = `${formatTimeOnlyBD(h.started_at)} – ${formatTimeOnlyBD(h.ended_at)}`;
                          } else if (h.started_at) {
                            // No ended_at in the API response = event still ongoing
                            duration = `${formatTimeOnlyBD(h.started_at)} –`;
                          }
                          return (
                            <tr key={h.id || i} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{i + 1}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  h.status === "Up"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                    : "bg-red-500/15 text-red-400 border border-red-500/20"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${h.status === "Up" ? "bg-emerald-400" : "bg-red-400"}`} />
                                  {h.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-emerald-400/80 font-mono text-xs">{fmt(h.up_time)}</td>
                              <td className="px-4 py-2.5 text-red-400/80 font-mono text-xs">{fmt(h.down_time)}</td>
                              <td className="px-4 py-2.5 text-slate-300 text-xs font-mono">{duration}</td>
                              <td className="px-4 py-2.5 text-slate-300 text-xs font-mono">
                                {h.started_at
                                  ? h.ended_at
                                    ? `${formatShortDateBD(h.started_at)}-${formatShortDateBD(h.ended_at)}`
                                    : formatShortDateBD(h.started_at)
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">No events found for this date</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Single BTS Modal (works for both single-date and range mode) ────────────
function BtsModal({ ip, start, end, isRange, btsName, rowDaysFound, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [dayDetail, setDayDetail] = useState(null); // { ip, date } for deep-dive modal

  async function handleExportBts() {
    setExporting(true);
    try {
      const url = isRange
        ? `${API_BASE_URL}/api/analytics/range/${ip}/excel?start=${start}&end=${end}`
        : `${API_BASE_URL}/api/analytics/date/${start}/${ip}/excel`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = isRange
        ? `bts-report-${ip}-${start}_to_${end}.xlsx`
        : `bts-report-${ip}-${start}.xlsx`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const url = isRange
          ? `${API_BASE_URL}/api/analytics/range/${ip}?start=${start}&end=${end}`
          : `${API_BASE_URL}/api/analytics/date/${start}/${ip}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ip, start, end, isRange]);

  const summary = data?.totals || data?.summary || data;
  const dayRecords = isRange ? data?.days || [] : [];
  const daysFound = data?.days_found ?? rowDaysFound ?? dayRecords.length;
  const events = !isRange ? data?.events || data?.cycles || data?.history || [] : [];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header — shows date/range once, no duplicate below */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">{btsName}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">{ip}</span>
              <span className="text-slate-500 text-xs">
                {isRange ? `${toDisplayDate(start)} — ${toDisplayDate(end)}` : toDisplayDate(start)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBts}
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
            </button>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <svg className="w-8 h-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : (
            <>
              {/* ── Single summary line ── */}
              {summary && (
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  {isRange && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <span className="text-slate-400 text-xs font-semibold">Days Found</span>
                      <span className="text-white font-black text-sm">{daysFound}</span>
                    </div>
                  )}
                  {[
                    { label: "Up Time",       value: fmt(summary.up_seconds ?? summary.up_time),     color: "emerald" },
                    { label: "Down Time",     value: fmt(summary.down_seconds ?? summary.down_time), color: "red"     },
                    { label: "Monitored Time",value: fmt((summary.up_seconds ?? summary.up_time ?? 0) + (summary.down_seconds ?? summary.down_time ?? 0)), color: "violet" },
                    { label: "Up Time %",     value: `${parseFloat(summary.uptime_pct ?? 0).toFixed(1)}%`,   color: "blue"    },
                    { label: "Down Time %",   value: `${parseFloat(summary.downtime_pct ?? 0).toFixed(1)}%`, color: "orange"  },
                    { label: "Total Down",    value: summary.down_incidents ?? "—",                  color: "rose"    },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
                      <span className="text-slate-400 text-xs font-semibold">{s.label}</span>
                      <span className={`text-${s.color}-400 font-black text-sm`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Range mode: date-wise breakdown table — rows are clickable */}
              {isRange ? (
                dayRecords.length > 0 ? (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-700/50 flex items-center justify-between">
                      <span className="text-white font-semibold text-sm">Date-wise Breakdown</span>
                      <span className="text-slate-500 text-xs">{dayRecords.length} days · click a row for full day detail</span>
                    </div>
                    <div className="overflow-auto" style={{ maxHeight: "calc(90vh - 360px)" }}>
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">#</th>
                            <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Date</th>
                            <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Up Time</th>
                            <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Down Time</th>
                            <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Monitored Time</th>
                            <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Up Time %</th>
                            <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Down Time %</th>
                            <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Total Down</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {dayRecords.map((d, i) => {
                            const rawDate = getRecordDate(d);
                            const displayDate = rawDate
                              ? /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
                                ? toDisplayDate(rawDate)
                                : formatTimeOnlyBD(rawDate) === "—"
                                  ? rawDate
                                  : new Date(rawDate).toLocaleDateString("en-BD", {
                                      timeZone: "Asia/Dhaka",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                              : "—";
                            // The API-format date (YYYY-MM-DD) needed for the drill-down fetch
                            const apiDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : rawDate;
                            return (
                              <tr
                                key={rawDate || i}
                                onClick={() => apiDate && setDayDetail({ ip, date: apiDate })}
                                className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                              >
                                <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{i + 1}</td>
                                <td className="px-4 py-2.5 text-slate-300 text-xs">{displayDate}</td>
                                <td className="px-4 py-2.5 text-emerald-400/80 font-mono text-xs">{fmt(d.up_seconds ?? d.up_time)}</td>
                                <td className="px-4 py-2.5 text-red-400/80 font-mono text-xs">{fmt(d.down_seconds ?? d.down_time)}</td>
                                <td className="px-4 py-2.5 text-violet-400/80 font-mono text-xs">{fmt((d.up_seconds ?? d.up_time ?? 0) + (d.down_seconds ?? d.down_time ?? 0))}</td>
                                <td className="px-4 py-2.5 text-blue-400 font-bold text-xs">{parseFloat(d.uptime_pct ?? 0).toFixed(1)}%</td>
                                <td className="px-4 py-2.5 text-orange-400 font-bold text-xs">{parseFloat(d.downtime_pct ?? 0).toFixed(1)}%</td>
                                <td className="px-4 py-2.5 text-slate-300 text-xs">{d.down_incidents ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-8">No date-wise data found for this range</div>
                )
              ) : events.length > 0 ? (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-700/50 flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">Events</span>
                    <span className="text-slate-500 text-xs">{events.length} records</span>
                  </div>
                  <div className="overflow-auto" style={{ maxHeight: "calc(90vh - 320px)" }}>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">#</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Status</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Up Time</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Down Time</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Duration</th>
                          <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {events.map((h, i) => {
                          let duration = "—";
                          if (h.started_at && h.ended_at) {
                            duration = `${formatTimeOnlyBD(h.started_at)} – ${formatTimeOnlyBD(h.ended_at)}`;
                          } else if (h.started_at) {
                            // No ended_at in the API response = event still ongoing
                            duration = `${formatTimeOnlyBD(h.started_at)} –`;
                          }
                          return (
                            <tr key={h.id || i} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{i + 1}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  h.status === "Up"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                    : "bg-red-500/15 text-red-400 border border-red-500/20"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${h.status === "Up" ? "bg-emerald-400" : "bg-red-400"}`} />
                                  {h.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-emerald-400/80 font-mono text-xs">{fmt(h.up_time)}</td>
                              <td className="px-4 py-2.5 text-red-400/80 font-mono text-xs">{fmt(h.down_time)}</td>
                              <td className="px-4 py-2.5 text-slate-300 text-xs font-mono">{duration}</td>
                              <td className="px-4 py-2.5 text-slate-300 text-xs font-mono">
                                {h.started_at
                                  ? h.ended_at
                                    ? `${formatShortDateBD(h.started_at)}-${formatShortDateBD(h.ended_at)}`
                                    : formatShortDateBD(h.started_at)
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">No events found for this date</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Day detail deep-dive modal — opened when a date-wise row is clicked */}
      {dayDetail && (
        <DayDetailModal
          ip={dayDetail.ip}
          date={dayDetail.date}
          btsName={btsName}
          onClose={() => setDayDetail(null)}
        />
      )}
    </div>
  );
}

// ── Reports Page ──────────────────────────────────────────────────────────────
export default function ReportsPage({ onBack }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rangeOpen, setRangeOpen] = useState(false);

  const [btsSearch, setBtsSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("single"); // "single" | "range"
  const [searchedStart, setSearchedStart] = useState("");
  const [searchedEnd, setSearchedEnd] = useState("");
  const [rangeDaysFound, setRangeDaysFound] = useState(null);
  const [selectedBts, setSelectedBts] = useState(null);
  const [exporting, setExporting] = useState(false);

  function sortByDowntime(arr) {
    return [...arr].sort((a, b) => {
      const aDown = a.down_seconds ?? a.down_time ?? 0;
      const bDown = b.down_seconds ?? b.down_time ?? 0;
      const aUp = a.up_seconds ?? a.up_time ?? 0;
      const bUp = b.up_seconds ?? b.up_time ?? 0;
      if (bDown !== aDown) return bDown - aDown;
      return aUp - bUp;
    });
  }

  async function runSearch() {
    if (!startDate) {
      setError("Please select a date");
      return;
    }
    const useRange = rangeOpen && !!endDate;
    setMode(useRange ? "range" : "single");
    setLoading(true);
    setError("");
    setData(null);
    setBtsSearch("");

    try {
      let json;
      if (useRange) {
        setSearchedStart(startDate);
        setSearchedEnd(endDate);
        const res = await fetch(`${API_BASE_URL}/api/analytics/range/all?start=${startDate}&end=${endDate}`);
        if (!res.ok) throw new Error("Failed to fetch");
        json = await res.json();
      } else {
        setSearchedStart(startDate);
        setSearchedEnd("");
        const res = await fetch(`${API_BASE_URL}/api/analytics/date/${startDate}`);
        if (!res.ok) throw new Error("Failed to fetch");
        json = await res.json();
      }
      const arr = extractArray(json);
      setData(sortByDowntime(arr));
      setRangeDaysFound(useRange ? (json?.days_found ?? arr[0]?.days_found ?? null) : null);
    } catch (e) {
      setError("Failed to fetch data: " + e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") runSearch();
  }

  async function handleExport() {
    setExporting(true);
    try {
      let url, filename;
      if (mode === "range" && searchedStart && searchedEnd) {
        url = `${API_BASE_URL}/api/analytics/range/all/excel?start=${searchedStart}&end=${searchedEnd}`;
        filename = `bts-report-${searchedStart}_to_${searchedEnd}.xlsx`;
      } else if (searchedStart) {
        url = `${API_BASE_URL}/api/analytics/date/${searchedStart}/excel`;
        filename = `bts-report-${searchedStart}.xlsx`;
      } else {
        return;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  const filtered = (data || []).filter(r =>
    r.bts_name?.toLowerCase().includes(btsSearch.toLowerCase()) ||
    r.ip_address?.includes(btsSearch)
  );

  const isRangeMode = mode === "range";
  const displayDateLabel = isRangeMode
    ? `${toDisplayDate(searchedStart)} — ${toDisplayDate(searchedEnd)}`
    : toDisplayDate(searchedStart);

  return (
    <div className="min-h-screen bg-[#080c18] text-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#0a0e1a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand with logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-16 h-16 flex items-center justify-center">
              <img src={logo} alt="Logo" width={50} height={50} />
            </div>
            <div>
              <div className="text-base font-black tracking-tight" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                BTS PDB REPORTS
              </div>
              <div className="text-[10px] text-indigo-400 tracking-wider">DATE-WISE ANALYTICS</div>
            </div>
          </div>

          {/* Search area — total 2 date boxes max (start / end), never 3 */}
          <div className="flex-1 flex items-center gap-3 max-w-2xl">
            {/* BTS search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={btsSearch}
                onChange={e => setBtsSearch(e.target.value)}
                placeholder="Search BTS name or IP..."
                disabled={!data}
                className="w-full bg-slate-800/60 border border-slate-700/50 text-white rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50 placeholder-slate-500 disabled:opacity-40 transition-all"
              />
            </div>

            {/* Start date (always visible — the single date box) */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                onKeyDown={handleKeyDown}
                max={new Date().toISOString().split("T")[0]}
                className="w-full bg-slate-800/60 border border-slate-700/50 text-white rounded-xl pl-10 pr-8 py-2 text-sm focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
              />
              {startDate && (
                <button onClick={() => setStartDate("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Arrow toggle — reveals the End date box */}
            <button
              onClick={() => setRangeOpen(o => !o)}
              title="Search by date range"
              className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                rangeOpen
                  ? "bg-indigo-500 border-indigo-500 text-white"
                  : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white hover:border-indigo-500/50"
              }`}
            >
              <svg className={`w-4 h-4 transition-transform ${rangeOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* End date — only shown when arrow is expanded */}
            {rangeOpen && (
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  onKeyDown={handleKeyDown}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full bg-slate-800/60 border border-slate-700/50 text-white rounded-xl pl-10 pr-8 py-2 text-sm focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                />
                {endDate && (
                  <button onClick={() => setEndDate("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={runSearch}
              disabled={loading || !startDate || (rangeOpen && !endDate)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {loading ? "..." : "Search"}
            </button>

          </div>

          {/* Back */}
          <button onClick={onBack}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl px-3 py-2 text-xs font-semibold transition-all shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-red-400 text-sm">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* No search yet */}
        {data === null && !loading && !error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-400 text-base font-semibold">For get information Search by date</p>
              <p className="text-slate-600 text-sm mt-1">Pick a date, or click the arrow to add an end date for a range</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-slate-400 text-sm">Loading report...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && data !== null && (
          <>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-indigo-400 font-bold text-sm">{displayDateLabel}</span>
              </div>
              {data.length > 0 && (
                <span className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-1.5 flex items-center gap-2 text-sm">
                  <span className="text-white font-bold">{filtered.length}</span> BTS found
                </span>
              )}
              {data.length > 0 && rangeDaysFound !== null && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <span className="text-slate-400 text-xs font-semibold">Day Found</span>
                  <span className="text-white font-black text-sm">{rangeDaysFound}</span>
                </div>
              )}
              {data.length > 0 && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="ml-auto flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
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
                </button>
              )}
            </div>

            {/* No data */}
            {data.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-semibold">No data found in this date.</p>
                  <p className="text-slate-600 text-sm mt-1">Try a different date</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1" style={{ maxHeight: "calc(100vh - 170px)" }}>
                  <table className="w-full text-sm" style={{ minWidth: "900px" }}>
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">#</th>
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">BTS Name</th>
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">IP Address</th>
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Up Time</th>
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Down Time</th>
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Monitored Time</th>
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Up Time %</th>
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Down Time %</th>
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Total Down</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-10 text-slate-500">
                            No BTS matching "{btsSearch}"
                          </td>
                        </tr>
                      ) : filtered.map((r, i) => {
                        const upSec = r.up_seconds ?? r.up_time ?? 0;
                        const downSec = r.down_seconds ?? r.down_time ?? 0;
                        const monitoredSec = upSec + downSec;
                        return (
                          <tr key={r.ip_address || i}
                            onClick={() => setSelectedBts(r)}
                            className="hover:bg-slate-800/40 transition-colors cursor-pointer group">
                            <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{i + 1}</td>
                            <td className="px-4 py-3.5">
                              <span className="text-white font-medium group-hover:text-indigo-400 transition-colors">
                                {r.bts_name}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">{r.ip_address}</span>
                            </td>
                            <td className="px-4 py-3.5 text-emerald-400 font-mono text-xs">{fmt(upSec)}</td>
                            <td className="px-4 py-3.5">
                              <span className={`font-mono text-xs ${downSec > 0 ? "text-red-400" : "text-slate-500"}`}>
                                {fmt(downSec)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-violet-400/80 font-mono text-xs">{fmt(monitoredSec)}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-700 rounded-full h-1.5">
                                  <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${Math.min(parseFloat(r.uptime_pct || 0), 100)}%` }} />
                                </div>
                                <span className="text-blue-400 font-bold text-xs">{parseFloat(r.uptime_pct ?? 0).toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`font-bold text-xs ${parseFloat(r.downtime_pct || 0) > 10 ? "text-red-400" : parseFloat(r.downtime_pct || 0) > 0 ? "text-orange-400" : "text-slate-500"}`}>
                                {parseFloat(r.downtime_pct ?? 0).toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {(r.down_incidents || 0) > 0 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 font-bold text-sm">
                                  {r.down_incidents}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* BTS Modal — handles both single-date and range mode internally */}
      {selectedBts && (
        <BtsModal
          ip={selectedBts.ip_address}
          start={searchedStart}
          end={searchedEnd}
          isRange={isRangeMode}
          btsName={selectedBts.bts_name}
          rowDaysFound={selectedBts.days_found}
          onClose={() => setSelectedBts(null)}
        />
      )}
    </div>
  );
}
