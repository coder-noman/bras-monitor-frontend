import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../utils/api";

// ── Shared small components ─────────────────────────────────────────────────
function Modal({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-slate-900 border border-slate-700 rounded-2xl w-full ${wide ? "max-w-4xl" : "max-w-md"} max-h-[90vh] flex flex-col shadow-2xl`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-700 shrink-0">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold transition-all ${
      toast.type === "error"
        ? "bg-red-500/20 border-red-500/40 text-red-300"
        : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
    }`}>
      {toast.type === "error"
        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      }
      {toast.msg}
    </div>
  );
}

// Excel upload button — click opens file picker, uploads on select
function ExcelUploadButton({ label, accent, onUpload, onDone }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const accentClasses = {
    cyan: "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/25 text-cyan-400",
    emerald: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-400",
  };

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    setUploading(true);
    try {
      const res = await onUpload(file);
      onDone?.(res, null);
    } catch (err) {
      onDone?.(null, err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`flex items-center gap-1.5 border rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${accentClasses[accent]}`}
      >
        {uploading ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" /></svg>
        )}
        {uploading ? "Uploading..." : label}
      </button>
    </>
  );
}

// Turn a snake_case key into a readable label
function labelize(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\b(Sa|Bts|Ip)\b/g, m => m.toUpperCase());
}

// Fields that should never be directly editable (system/meta fields)
const READONLY_FIELDS = new Set(["id", "uploaded_at", "updated_at", "created_at", "bts_name"]);
// Fields that should render as a multi-line textarea
const TEXTAREA_FIELDS = new Set(["contact_person", "address"]);

// ── Generic detail modal with Edit Mode / Save toggle ───────────────────────
function DetailModal({ title, data, primaryKey, onClose, onSave, onDelete, deleteLabel, readonlyFields = READONLY_FIELDS, startInEditMode = false }) {
  const [editMode, setEditMode] = useState(!!startInEditMode);
  const [form, setForm] = useState(data);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { setForm(data); }, [data]);

  const keys = Object.keys(data);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(form);
      setEditMode(false);
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">{title}</h2>
            {primaryKey && (
              <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg inline-block mt-1">{primaryKey}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
            )}
            {editMode ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
                {saving ? "Saving..." : "Save"}
              </button>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl px-4 py-2 text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit Mode
              </button>
            )}
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Confirm delete banner */}
        {confirmDelete && (
          <div className="mx-5 mt-4 bg-red-500/10 border border-red-500/25 rounded-xl p-4 flex items-center justify-between shrink-0">
            <span className="text-red-300 text-sm">Are you sure you want to delete <b>{deleteLabel}</b>? This cannot be undone.</span>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-all">
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}

        {/* Edit mode banner */}
        {editMode && !confirmDelete && (
          <div className="mx-5 mt-4 bg-blue-500/10 border border-blue-500/25 rounded-xl px-4 py-2.5 shrink-0">
            <span className="text-blue-300 text-xs font-semibold">✏️ Edit mode active — change fields below then click Save</span>
          </div>
        )}

        {/* Field grid */}
        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {keys.map(key => {
              const isReadonly = readonlyFields.has(key) || !editMode;
              const isTextarea = TEXTAREA_FIELDS.has(key);
              const value = form[key];
              const spanFull = isTextarea;
              return (
                <div key={key} className={spanFull ? "sm:col-span-2" : ""}>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    {labelize(key)}
                  </label>
                  {isTextarea ? (
                    <textarea
                      value={value ?? ""}
                      disabled={isReadonly}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      rows={3}
                      className={`w-full rounded-lg px-3 py-2 text-sm transition-all resize-none ${
                        isReadonly
                          ? "bg-slate-800/40 border border-slate-800 text-slate-400"
                          : "bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-blue-500/70"
                      }`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value ?? ""}
                      disabled={isReadonly}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className={`w-full rounded-lg px-3 py-2 text-sm font-mono transition-all ${
                        isReadonly
                          ? "bg-slate-800/40 border border-slate-800 text-slate-400"
                          : "bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-blue-500/70"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB 1 — Routers
// ══════════════════════════════════════════════════════════════════════════
function RouterTab({ showToast }) {
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [addModal, setAddModal] = useState(false);
  const [editRouter, setEditRouter] = useState(null);
  const [deleteRouter, setDeleteRouter] = useState(null);

  const [form, setForm] = useState({ bts_name: "", ip_address: "", bts_code: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchRouters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRouters();
      const arr = Array.isArray(data) ? data : data.data || data.routers || [];
      setRouters(arr);
    } catch (e) {
      showToast("Failed to load routers: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchRouters(); }, [fetchRouters]);

  const filtered = routers.filter(r =>
    r.bts_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.ip_address?.includes(search) ||
    r.bts_code?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleAdd(e) {
    e.preventDefault();
    setFormError("");
    if (!form.bts_name.trim() || !form.ip_address.trim() || !form.bts_code.trim()) {
      setFormError("All fields are required");
      return;
    }
    setFormLoading(true);
    try {
      await api.addRouter(form.bts_name.trim(), form.ip_address.trim(), form.bts_code.trim());
      setAddModal(false);
      setForm({ bts_name: "", ip_address: "", bts_code: "" });
      showToast("BTS added successfully");
      fetchRouters();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      await api.updateRouter(editRouter.ip_address, { bts_name: form.bts_name, ip_address: form.ip_address, bts_code: form.bts_code });
      setEditRouter(null);
      showToast("BTS updated successfully");
      fetchRouters();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    setFormLoading(true);
    try {
      await api.deleteRouter(deleteRouter.ip_address);
      setDeleteRouter(null);
      showToast("BTS deleted successfully");
      fetchRouters();
    } catch (e) {
      showToast("Delete failed: " + e.message, "error");
    } finally {
      setFormLoading(false);
    }
  }

  function openEdit(r) {
    setForm({ bts_name: r.bts_name, ip_address: r.ip_address, bts_code: r.bts_code || "" });
    setFormError("");
    setEditRouter(r);
  }

  function openAdd() {
    setForm({ bts_name: "", ip_address: "", bts_code: "" });
    setFormError("");
    setAddModal(true);
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
          <span className="text-amber-400 font-bold">{routers.length}</span>
          <span className="text-slate-400 text-sm ml-1">total BTS</span>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search BTS, IP or code..."
            className="w-full bg-slate-800/60 border border-slate-700/50 text-white rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500/50 placeholder-slate-500" />
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl px-3 py-2 text-xs font-bold transition-all ml-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add BTS
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">#</th>
                <th className="text-left px-5 py-3 font-semibold">BTS Name</th>
                <th className="text-left px-5 py-3 font-semibold">IP Address</th>
                <th className="text-left px-5 py-3 font-semibold">BTS Code</th>
                <th className="text-center px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-16">
                  <svg className="w-8 h-8 animate-spin text-amber-400 mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16 text-slate-500">
                  {search ? "No BTS found" : "No routers configured"}
                </td></tr>
              ) : paginated.map((r, i) => (
                <tr key={r.ip_address} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-white font-medium">{r.bts_name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-amber-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">{r.ip_address}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.bts_code
                      ? <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">{r.bts_code}</span>
                      : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(r)}
                        className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-400 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Update
                      </button>
                      <button onClick={() => setDeleteRouter(r)}
                        className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800">
            <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {addModal && (
        <Modal title="Add New BTS" onClose={() => setAddModal(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">BTS Name</label>
              <input type="text" value={form.bts_name} onChange={e => setForm(f => ({ ...f, bts_name: e.target.value }))}
                placeholder="e.g. Dhaka-Mirpur-BTS-001"
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/70 placeholder-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">IP Address</label>
              <input type="text" value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))}
                placeholder="e.g. 192.168.1.100"
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/70 placeholder-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">BTS Code</label>
              <input type="text" value={form.bts_code} onChange={e => setForm(f => ({ ...f, bts_code: e.target.value }))}
                placeholder="e.g. Link3-SA00001"
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/70 placeholder-slate-500" />
            </div>
            {formError && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{formError}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAddModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-semibold transition-all">
                Cancel
              </button>
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 transition-all">
                {formLoading ? "Adding..." : "Add BTS"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editRouter && (
        <Modal title="Update BTS" onClose={() => setEditRouter(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">BTS Name</label>
              <input type="text" value={form.bts_name} onChange={e => setForm(f => ({ ...f, bts_name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/70" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">IP Address</label>
              <input type="text" value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/70" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">BTS Code</label>
              <input type="text" value={form.bts_code} onChange={e => setForm(f => ({ ...f, bts_code: e.target.value }))}
                placeholder="e.g. Link3-SA00001"
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/70 placeholder-slate-500" />
            </div>
            {formError && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{formError}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditRouter(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-semibold transition-all">
                Cancel
              </button>
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 transition-all">
                {formLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteRouter && (
        <Modal title="Confirm Delete" onClose={() => setDeleteRouter(null)}>
          <div className="space-y-5">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-300 text-sm">This will permanently delete the router and ALL its ping history. This action cannot be undone.</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">BTS Name</p>
              <p className="text-white font-semibold">{deleteRouter.bts_name}</p>
              <p className="text-slate-400 text-xs mt-2 mb-1">IP Address</p>
              <p className="text-amber-400 font-mono text-sm">{deleteRouter.ip_address}</p>
              {deleteRouter.bts_code && (
                <>
                  <p className="text-slate-400 text-xs mt-2 mb-1">BTS Code</p>
                  <p className="text-cyan-400 font-mono text-sm">{deleteRouter.bts_code}</p>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteRouter(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-semibold transition-all">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={formLoading}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 transition-all">
                {formLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB 2 — SA Data (site profiles: /api/sa)
// ══════════════════════════════════════════════════════════════════════════
const SA_READONLY = new Set(["id", "created_at", "updated_at", "uploaded_at"]);

// Keep the original data type when a value is edited as text
function coerceLike(orig, val) {
  if (typeof val !== "string") return val;
  if (val === "") return orig === null || orig === undefined ? null : "";
  if (typeof orig === "number" && !isNaN(Number(val))) return Number(val);
  if (typeof orig === "boolean") {
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
  }
  return val;
}

function SATab({ showToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [selected, setSelected] = useState(null); // { row, edit }
  const [addModal, setAddModal] = useState(false);
  const [deleteSa, setDeleteSa] = useState(null);

  const [form, setForm] = useState({});
  const [extra, setExtra] = useState([]); // custom fields: [{ key, value }]
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSAList();
      const arr = Array.isArray(data) ? data : data.data || data.sa || data.sites || [];
      setList(arr);
    } catch (e) {
      showToast("Failed to load SA data: " + e.message, "error");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // All editable field names seen in the data (sa_code and sa_name first)
  const fieldKeys = (() => {
    const set = new Set(["sa_code", "sa_name"]);
    list.slice(0, 20).forEach(r => Object.keys(r).forEach(k => { if (!SA_READONLY.has(k)) set.add(k); }));
    return [...set];
  })();
  const columnKeys = fieldKeys.slice(0, 7);

  const filtered = list.filter(r =>
    !search ||
    Object.values(r).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAdd() {
    const blank = {};
    fieldKeys.forEach(k => { blank[k] = ""; });
    setForm(blank);
    setExtra([]);
    setFormError("");
    setAddModal(true);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setFormError("");
    if (!String(form.sa_code || "").trim()) {
      setFormError("SA code is required");
      return;
    }
    const template = list[0] || {};
    const payload = {};
    Object.keys(form).forEach(k => {
      const v = typeof form[k] === "string" ? form[k].trim() : form[k];
      if (v === "" || v === null || v === undefined) return;
      payload[k] = coerceLike(template[k], v);
    });
    extra.forEach(f => {
      const k = f.key.trim();
      if (k && String(f.value).trim() !== "") payload[k] = String(f.value).trim();
    });
    setFormLoading(true);
    try {
      await api.addSA(payload);
      setAddModal(false);
      showToast("SA added successfully");
      fetchList();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  // Save from the detail modal — every editable field is sent
  async function handleSave(edited) {
    const row = selected.row;
    const payload = {};
    Object.keys(row).forEach(k => {
      if (SA_READONLY.has(k)) return;
      payload[k] = coerceLike(row[k], edited[k]);
    });
    await api.updateSA(row.sa_code, payload);
    showToast("SA updated successfully");
    setSelected({ row: { ...row, ...payload }, edit: false });
    fetchList();
  }

  async function handleDeleteFromModal() {
    await api.deleteSA(selected.row.sa_code);
    showToast("SA deleted successfully");
    fetchList();
  }

  async function handleDelete() {
    setFormLoading(true);
    try {
      await api.deleteSA(deleteSa.sa_code);
      setDeleteSa(null);
      showToast("SA deleted successfully");
      fetchList();
    } catch (e) {
      showToast("Delete failed: " + e.message, "error");
    } finally {
      setFormLoading(false);
    }
  }

  const inputCls = "w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/70 placeholder-slate-500";

  return (
    <>
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-2">
          <span className="text-cyan-400 font-bold">{list.length}</span>
          <span className="text-slate-400 text-sm ml-1">total SA</span>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search SA..."
            className="w-full bg-slate-800/60 border border-slate-700/50 text-white rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 placeholder-slate-500" />
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl px-3 py-2 text-xs font-bold transition-all ml-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add SA
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">#</th>
                {columnKeys.map(k => (
                  <th key={k} className="text-left px-5 py-3 font-semibold whitespace-nowrap">{labelize(k)}</th>
                ))}
                <th className="text-center px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={columnKeys.length + 2} className="text-center py-16">
                  <svg className="w-8 h-8 animate-spin text-cyan-400 mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={columnKeys.length + 2} className="text-center py-16 text-slate-500">
                  {search ? "No SA found" : "No SA data available"}
                </td></tr>
              ) : paginated.map((r, i) => (
                <tr key={r.sa_code || i}
                  onClick={() => setSelected({ row: r, edit: false })}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group">
                  <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  {columnKeys.map(k => (
                    <td key={k} className="px-5 py-3.5 whitespace-nowrap">
                      {k === "sa_code" ? (
                        <span className="font-mono text-cyan-400/80 text-xs bg-slate-800/60 px-2 py-1 rounded-lg">{r[k]}</span>
                      ) : k === "sa_name" ? (
                        <span className="text-white font-medium group-hover:text-cyan-400 transition-colors">{r[k]}</span>
                      ) : (
                        <span className="text-slate-300 text-xs font-mono">
                          {r[k] === null || r[k] === undefined || r[k] === "" ? "—" : String(r[k])}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={e => { e.stopPropagation(); setSelected({ row: r, edit: true }); }}
                        className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-400 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Update
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteSa(r); }}
                        className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800">
            <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View / update every field */}
      {selected && (
        <DetailModal
          title={selected.row.sa_name || selected.row.sa_code}
          primaryKey={selected.row.sa_code}
          data={selected.row}
          readonlyFields={SA_READONLY}
          startInEditMode={selected.edit}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDeleteFromModal}
          deleteLabel={selected.row.sa_name || selected.row.sa_code}
        />
      )}

      {/* Add SA */}
      {addModal && (
        <Modal title="Add New SA" wide onClose={() => setAddModal(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(form).map(k => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {labelize(k)}{k === "sa_code" ? " *" : ""}
                  </label>
                  <input type="text" value={form[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={k === "sa_code" ? "e.g. bras1" : ""}
                    className={inputCls} />
                </div>
              ))}
            </div>

            {extra.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Fields</div>
                {extra.map((f, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input type="text" value={f.key} placeholder="field_name"
                      onChange={e => setExtra(x => x.map((it, j) => j === i ? { ...it, key: e.target.value } : it))}
                      className={inputCls} />
                    <input type="text" value={f.value} placeholder="value"
                      onChange={e => setExtra(x => x.map((it, j) => j === i ? { ...it, value: e.target.value } : it))}
                      className={inputCls} />
                    <button type="button" onClick={() => setExtra(x => x.filter((_, j) => j !== i))}
                      className="w-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold">×</button>
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setExtra(x => [...x, { key: "", value: "" }])}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300">
              + Add custom field
            </button>

            {formError && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{formError}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAddModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-semibold transition-all">
                Cancel
              </button>
              <button type="submit" disabled={formLoading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 transition-all">
                {formLoading ? "Adding..." : "Add SA"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete SA */}
      {deleteSa && (
        <Modal title="Confirm Delete" onClose={() => setDeleteSa(null)}>
          <div className="space-y-5">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-300 text-sm">This will permanently delete this SA. This action cannot be undone.</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">SA Name</p>
              <p className="text-white font-semibold">{deleteSa.sa_name || "—"}</p>
              <p className="text-slate-400 text-xs mt-2 mb-1">SA Code</p>
              <p className="text-cyan-400 font-mono text-sm">{deleteSa.sa_code}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteSa(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-semibold transition-all">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={formLoading}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 transition-all">
                {formLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE — department tabs
// ══════════════════════════════════════════════════════════════════════════
export default function AdminPage({ onBack }) {
  const [tab, setTab] = useState("routers"); // "routers" | "sa"
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const tabs = [
    { key: "routers", label: "Router Data", color: "amber", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" },
    { key: "sa", label: "SA Data", color: "cyan", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  ];

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      <Toast toast={toast} />

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#0a0e1a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="text-base font-black tracking-tight" style={{ fontFamily: "'Rajdhani', sans-serif" }}>ADMIN PANEL</div>
              <div className="text-[10px] text-amber-500 tracking-wider">SYSTEM MANAGEMENT</div>
            </div>
          </div>

          <button onClick={onBack}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl px-3 py-2 text-xs font-semibold transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Dashboard
          </button>
        </div>

        {/* Department tabs */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center gap-2 pb-3">
          {tabs.map(t => {
            const activeClasses = {
              amber: "bg-amber-500 text-white shadow-lg shadow-amber-500/25",
              emerald: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25",
              cyan: "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25",
            };
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  tab === t.key
                    ? activeClasses[t.color]
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                </svg>
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {tab === "routers" && <RouterTab showToast={showToast} />}
        {tab === "sa" && <SATab showToast={showToast} />}
      </div>
    </div>
  );
}
