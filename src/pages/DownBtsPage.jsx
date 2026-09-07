import React, { useState, useEffect, useCallback, useRef } from "react";
import html2canvas from "html2canvas";
import { api } from "../utils/api";
import { formatSeconds } from "../utils/formatters";
import BatteryGauge from "../components/BatteryGauge";

const ROWS_PER_COLUMN = 15;
const FIXED_COLUMNS = 3;
const MAX_VISIBLE = ROWS_PER_COLUMN * FIXED_COLUMNS;

// "Cumilla-Chauddagram-BTS-Chauddagram (L3)" -> "BTS-Chauddagram (L3)"
// "Gazipur-Gacha-BTS-Gacha (SA)" -> "BTS-Gacha (SA)"
function shortenBtsName(name) {
  if (!name) return "—";
  const idx = name.indexOf("BTS-");
  return idx !== -1 ? name.slice(idx) : name;
}

// Always exactly 3 columns of up to 15 rows each, filled in order
// (highest downtime first). Anything beyond 45 isn't shown — see the
// "+N more" note under the table.
function chunkIntoFixedColumns(list) {
  const columns = [];
  for (let c = 0; c < FIXED_COLUMNS; c++) {
    columns.push(list.slice(c * ROWS_PER_COLUMN, (c + 1) * ROWS_PER_COLUMN));
  }
  return columns;
}

// e.g. 2026-08-13_21-05-42
function currentTimeStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

export default function DownBtsPage({ onClose }) {
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const captureRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getDownRouters();
      const arr = Array.isArray(data) ? data : data.data || data.routers || [];
      setRouters(arr);
      setError("");
    } catch (e) {
      setError("API connection error: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleScreenshot() {
    if (!captureRef.current) return;
    setCapturing(true);
    try {
      // Make sure web fonts are fully loaded before rasterizing — otherwise
      // html2canvas can capture mid-swap and render BTS names with the
      // wrong glyph widths (letters missing/overlapping/cut off).
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#080c18",
        scale: 3,
        useCORS: true,
        letterRendering: true,
        imageTimeout: 0,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${currentTimeStamp()}_down_events.png`;
      a.click();
    } catch (e) {
      alert("Screenshot failed: " + e.message);
    } finally {
      setCapturing(false);
    }
  }

  // Serial order: highest downtime first
  const sorted = [...routers].sort(
    (a, b) => (b.down_time || 0) - (a.down_time || 0),
  );
  const columns = chunkIntoFixedColumns(sorted);
  const hiddenCount = Math.max(0, sorted.length - MAX_VISIBLE);

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#080c18] border border-slate-800 rounded-2xl w-full max-w-[1800px] h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Minimal top bar — just back + screenshot */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            title="Back to dashboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <button
            onClick={handleScreenshot}
            disabled={capturing || loading || sorted.length === 0}
            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-40"
            title="Save screenshot to device"
          >
            {capturing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            {capturing ? "Saving..." : "Screenshot"}
          </button>
        </div>

        {/* Body — fixed height, no scroll */}
        <div className="flex-1 overflow-hidden p-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <svg className="w-10 h-10 animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <span className="text-5xl">✅</span>
              <p className="text-emerald-400 font-bold">All BTS are up — nothing down right now.</p>
            </div>
          ) : (
            <div
              ref={captureRef}
              className="bg-slate-900/50 border border-slate-800 rounded-xl h-full overflow-hidden flex flex-col"
            >
              <div className="flex flex-1 min-h-0">
                {columns.map((col, colIdx) => (
                  <div
                    key={colIdx}
                    className={`flex-1 min-w-0 flex flex-col ${
                      colIdx > 0 ? "border-l border-slate-700/60" : ""
                    }`}
                  >
                    {col.map((r, i) => {
                      const rank = colIdx * ROWS_PER_COLUMN + i + 1;
                      return (
                        <div
                          key={r.ip_address || rank}
                          className="flex items-start gap-2.5 px-3 py-2 border-b border-slate-800/50 last:border-b-0"
                        >
                          <span className="text-slate-500 font-mono text-xs w-5 shrink-0 text-right pt-0.5">
                            {rank}
                          </span>
                          <span
                            className="text-white font-semibold text-sm flex-1 min-w-0 leading-snug break-words whitespace-normal"
                            title={r.bts_name}
                          >
                            {shortenBtsName(r.bts_name)}
                          </span>
                          <span className="text-red-400 font-mono text-xs font-bold shrink-0 whitespace-nowrap pt-0.5">
                            {formatSeconds(r.down_time)}
                          </span>
                          <div className="shrink-0 pt-0.5">
                            <BatteryGauge
                              soc={r.battery_soc}
                              capacity={r.battery_current_capacity}
                              backupHour={r.backup_hour}
                              compact
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {hiddenCount > 0 && (
                <div className="shrink-0 text-center text-[11px] text-slate-500 py-1.5 border-t border-slate-800/60">
                  +{hiddenCount} more down BTS not shown (lowest downtime)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
