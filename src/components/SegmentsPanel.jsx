/**
 * SegmentsPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * A slide-over sheet accessible globally from the sidebar.
 * Lets you manage which industry segments the pipeline will target:
 *   • Seed the 12 catalog segments in one click
 *   • Add custom segments (label, key, cluster, colour, description)
 *   • Toggle active / inactive per segment
 *   • Reorder by priority
 *   • Delete custom segments
 *
 * Talks to:  GET/POST/PUT/DELETE  /api/segments
 *            POST                  /api/segments/seed
 */

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Layers, ChevronUp, ChevronDown, CheckCircle2, XCircle, RefreshCw,
  Plus, Trash2, ChevronDown as Chevron, X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

// ─── Predefined clusters ──────────────────────────────────────────────────────
const CLUSTERS = [
  "Traditional Sweets",
  "Bakery & Confectionery",
  "Food Processing",
  "Dairy & Frozen",
  "Beverage",
  "HORECA",
  "Health & Organic",
  "Fermentation",
  "Other",
];

// ─── Colour swatches the admin can pick ──────────────────────────────────────
const COLOR_SWATCHES = [
  "#A0522D", "#B85C38", "#662B01", "#D4956A",
  "#7B6D47", "#C4878A", "#4A7FA5", "#3D6B56",
  "#627F31", "#5A8A3C", "#7B4F72", "#5C736A",
];

// ─── Cluster colour map ───────────────────────────────────────────────────────
const CLUSTER_COLORS = {
  "Traditional Sweets":    { bg: "#FDF0E8", text: "#A0522D", border: "#E8C4A0" },
  "Bakery & Confectionery":{ bg: "#FEF3EE", text: "#B85C38", border: "#EEC4B0" },
  "Food Processing":       { bg: "#F5F3EE", text: "#7B6D47", border: "#C8BFA0" },
  "Dairy & Frozen":        { bg: "#FDF0F2", text: "#C4878A", border: "#EEC0C4" },
  "Beverage":              { bg: "#EEF4F9", text: "#4A7FA5", border: "#A8C4DC" },
  "HORECA":                { bg: "#EDF0EA", text: "#3D6B56", border: "#A8C0B0" },
  "Health & Organic":      { bg: "#EEF5EE", text: "#5A8A3C", border: "#A8C8A0" },
  "Fermentation":          { bg: "#F3EEF5", text: "#7B4F72", border: "#C0A0BC" },
};
function ClusterBadge({ cluster }) {
  const c = CLUSTER_COLORS[cluster] || { bg: "#F0F0F0", text: "#5C736A", border: "#D0D0D0" };
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {cluster}
    </span>
  );
}

// ─── Priority pill ────────────────────────────────────────────────────────────
function PriorityBadge({ value }) {
  const color = value === 1 ? "#B85C38" : value === 2 ? "#662B01" : "#5C736A";
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: color + "18", color }}
    >
      P{value}
    </span>
  );
}

// ─── Single segment row ───────────────────────────────────────────────────────
function SegmentRow({ seg, onToggle, onPriorityUp, onPriorityDown, onDelete }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-[#EDF0EA] transition-colors ${
        seg.is_active ? "bg-white" : "bg-[#F8F9F6] opacity-60"
      }`}
    >
      {/* Active toggle */}
      <button
        onClick={() => onToggle(seg.id)}
        title={seg.is_active ? "Click to deactivate" : "Click to activate"}
        className="flex-shrink-0 transition-transform hover:scale-110"
      >
        {seg.is_active ? (
          <CheckCircle2 size={18} className="text-[#627F31]" />
        ) : (
          <XCircle size={18} className="text-[#9CA3AF]" />
        )}
      </button>

      {/* Colour swatch */}
      <span
        className="flex-shrink-0 w-3 h-3 rounded-full"
        style={{ backgroundColor: seg.color }}
      />

      {/* Segment info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#16221E] truncate">{seg.label}</span>
          <ClusterBadge cluster={seg.cluster} />
        </div>
        {seg.description && (
          <p className="text-xs text-[#5C736A] mt-0.5 line-clamp-1">{seg.description}</p>
        )}
      </div>

      {/* Priority controls */}
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <button
          onClick={() => onPriorityUp(seg.id, seg.priority)}
          disabled={seg.priority <= 1}
          className="text-[#5C736A] hover:text-[#627F31] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp size={14} />
        </button>
        <PriorityBadge value={seg.priority} />
        <button
          onClick={() => onPriorityDown(seg.id, seg.priority)}
          className="text-[#5C736A] hover:text-[#627F31] transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(seg.id, seg.label)}
        className="flex-shrink-0 text-[#9CA3AF] hover:text-red-500 transition-colors"
        title="Remove segment"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ─── Add custom segment form ──────────────────────────────────────────────────
const BLANK = { label: "", key: "", cluster: "HORECA", color: "#627F31", description: "" };

function toKey(label) {
  // Turn "My Segment" → "MySegment" (PascalCase, alphanumeric only)
  return label
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    .replace(/[^A-Za-z0-9]/g, "");
}

function AddSegmentForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleLabelChange = (val) => {
    setForm((f) => ({ ...f, label: val, key: toKey(val) }));
  };

  const handleAdd = async () => {
    if (!form.label.trim() || !form.key.trim()) return;
    setAdding(true);
    setError("");
    try {
      const created = await onAdd(form);
      if (created) {
        setForm(BLANK);
        setOpen(false);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add segment");
    }
    setAdding(false);
  };

  return (
    <div className="border-b border-[#EDF0EA]">
      {/* Toggle header */}
      <button
        onClick={() => { setOpen((o) => !o); setError(""); }}
        className="w-full flex items-center justify-between px-5 py-3 bg-[#F8F9F6] hover:bg-[#EDF0EA] transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-[#627F31] uppercase tracking-widest" style={{ letterSpacing: "0.12em" }}>
          <Plus size={13} />
          Add Custom Segment
        </span>
        <ChevronDown size={14} className={`text-[#5C736A] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 py-4 space-y-3 bg-white">
          {/* Label */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#5C736A] block mb-1" style={{ letterSpacing: "0.1em" }}>Display Name *</label>
            <input
              value={form.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Confectionery"
              className="w-full border border-[#DCE1D9] rounded-md px-3 py-2 text-sm text-[#16221E] bg-white focus:outline-none focus:ring-1 focus:ring-[#627F31]"
            />
          </div>

          {/* Key */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#5C736A] block mb-1" style={{ letterSpacing: "0.1em" }}>
              Key <span className="normal-case font-normal text-[#9CA3AF]">(unique ID, auto-filled)</span>
            </label>
            <input
              value={form.key}
              onChange={(e) => set("key", e.target.value.replace(/\s/g, ""))}
              placeholder="Confectionery"
              className="w-full border border-[#DCE1D9] rounded-md px-3 py-2 text-sm font-mono text-[#16221E] bg-white focus:outline-none focus:ring-1 focus:ring-[#627F31]"
            />
          </div>

          {/* Cluster + Colour on same row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[#5C736A] block mb-1" style={{ letterSpacing: "0.1em" }}>Cluster</label>
              <select
                value={form.cluster}
                onChange={(e) => set("cluster", e.target.value)}
                className="w-full border border-[#DCE1D9] rounded-md px-2 py-2 text-xs text-[#16221E] bg-white focus:outline-none focus:ring-1 focus:ring-[#627F31]"
              >
                {CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[#5C736A] block mb-1" style={{ letterSpacing: "0.1em" }}>Colour</label>
              <div className="flex flex-wrap gap-1.5 mt-0.5" style={{ maxWidth: 120 }}>
                {COLOR_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => set("color", hex)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: hex,
                      borderColor: form.color === hex ? "#16221E" : "transparent",
                    }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#5C736A] block mb-1" style={{ letterSpacing: "0.1em" }}>Description <span className="normal-case font-normal text-[#9CA3AF]">(optional)</span></label>
            <input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of this segment…"
              className="w-full border border-[#DCE1D9] rounded-md px-3 py-2 text-sm text-[#16221E] bg-white focus:outline-none focus:ring-1 focus:ring-[#627F31]"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {/* Preview + actions */}
          <div className="flex items-center justify-between pt-1">
            {/* Mini preview */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: form.color }} />
              <span className="text-xs font-semibold text-[#16221E]">{form.label || "Preview"}</span>
              {form.cluster && <ClusterBadge cluster={form.cluster} />}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setForm(BLANK); setError(""); }}
                className="px-3 py-1.5 rounded-md text-xs text-[#5C736A] border border-[#DCE1D9] hover:bg-[#F8F9F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.label.trim() || !form.key.trim() || adding}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#662B01" }}
              >
                <Plus size={12} />
                {adding ? "Adding…" : "Add Segment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function SegmentsPanel({ open, onOpenChange }) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/segments`);
      setSegments(res.data || []);
    } catch {
      /* silently fail */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchSegments();
  }, [open, fetchSegments]);

  // ── Seed catalog (first-run) ───────────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true);
    try {
      await axios.post(`${API}/segments/seed`);
      await fetchSegments();
    } catch { /* ignore */ }
    setSeeding(false);
  };

  // ── Add custom ─────────────────────────────────────────────────────────────
  const handleAdd = async (form) => {
    const res = await axios.post(`${API}/segments`, {
      key: form.key,
      label: form.label,
      cluster: form.cluster,
      color: form.color,
      description: form.description,
    });
    setSegments((prev) => [...prev, res.data]);
    return res.data;
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      const res = await axios.put(`${API}/segments/${id}/toggle`);
      setSegments((prev) => prev.map((s) => (s.id === id ? res.data : s)));
    } catch { /* ignore */ }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id, label) => {
    if (!window.confirm(`Remove "${label}" from pipeline segments?`)) return;
    try {
      await axios.delete(`${API}/segments/${id}`);
      setSegments((prev) => prev.filter((s) => s.id !== id));
    } catch { /* ignore */ }
  };

  // ── Priority ───────────────────────────────────────────────────────────────
  const handlePriorityUp = async (id, current) => {
    if (current <= 1) return;
    try {
      const res = await axios.put(`${API}/segments/${id}/priority`, { priority: current - 1 });
      setSegments((prev) => prev.map((s) => (s.id === id ? res.data : s)));
    } catch { /* ignore */ }
  };

  const handlePriorityDown = async (id, current) => {
    try {
      const res = await axios.put(`${API}/segments/${id}/priority`, { priority: current + 1 });
      setSegments((prev) => prev.map((s) => (s.id === id ? res.data : s)));
    } catch { /* ignore */ }
  };

  // ── Sort by priority then label ────────────────────────────────────────────
  const sorted = [...segments].sort((a, b) =>
    a.priority !== b.priority ? a.priority - b.priority : a.label.localeCompare(b.label)
  );
  const activeCount = segments.filter((s) => s.is_active).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[380px] sm:w-[440px] p-0 flex flex-col bg-white border-l border-[#DCE1D9]"
        style={{ maxWidth: "440px" }}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#EDF0EA] flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#627F31] flex items-center justify-center">
                <Layers size={17} className="text-white" />
              </div>
              <div>
                <SheetTitle
                  className="text-base font-bold text-[#16221E]"
                  style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                >
                  Pipeline Segments
                </SheetTitle>
                <SheetDescription className="text-xs text-[#5C736A] mt-0.5">
                  {activeCount} active · {segments.length} total
                </SheetDescription>
              </div>
            </div>

            {/* Seed button — always visible if catalog not fully loaded */}
            <button
              onClick={handleSeed}
              disabled={seeding}
              title="Load / refresh master catalog"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#DCE1D9] text-[#5C736A] hover:bg-[#EDF0EA] disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={11} className={seeding ? "animate-spin" : ""} />
              {seeding ? "Loading…" : "Load Catalog"}
            </button>
          </div>
          <p className="text-xs text-[#5C736A] mt-2 leading-relaxed">
            Toggle segments on/off to control which industry types the pipeline discovers. Reorder by priority to process high-value segments first.
          </p>
        </SheetHeader>

        {/* Add custom segment form */}
        {!loading && <AddSegmentForm onAdd={handleAdd} />}

        {/* Segment list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-[#5C736A]">
              Loading segments…
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 px-6 text-center">
              <Layers size={32} className="text-[#DCE1D9]" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-[#16221E]">No segments loaded yet</p>
                <p className="text-xs text-[#5C736A] mt-1 mb-4">
                  Click <strong>Load Catalog</strong> to seed all 12 standard segments, or use <strong>Add Custom Segment</strong> above to create your own.
                </p>
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50 hover:opacity-90"
                  style={{ backgroundColor: "#662B01" }}
                >
                  <RefreshCw size={14} className={seeding ? "animate-spin" : ""} />
                  {seeding ? "Loading…" : "Load All Segments"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active */}
              {sorted.filter((s) => s.is_active).length > 0 && (
                <div>
                  <p
                    className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold text-[#5C736A] bg-[#F8F9F6] border-b border-[#EDF0EA]"
                    style={{ letterSpacing: "0.12em" }}
                  >
                    Active — included in pipeline discovery
                  </p>
                  {sorted.filter((s) => s.is_active).map((seg) => (
                    <SegmentRow
                      key={seg.id}
                      seg={seg}
                      onToggle={handleToggle}
                      onPriorityUp={handlePriorityUp}
                      onPriorityDown={handlePriorityDown}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}

              {/* Inactive */}
              {sorted.filter((s) => !s.is_active).length > 0 && (
                <div>
                  <p
                    className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold text-[#5C736A] bg-[#F8F9F6] border-b border-[#EDF0EA]"
                    style={{ letterSpacing: "0.12em" }}
                  >
                    Paused
                  </p>
                  {sorted.filter((s) => !s.is_active).map((seg) => (
                    <SegmentRow
                      key={seg.id}
                      seg={seg}
                      onToggle={handleToggle}
                      onPriorityUp={handlePriorityUp}
                      onPriorityDown={handlePriorityDown}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EDF0EA] flex-shrink-0 bg-[#F8F9F6]">
          <p className="text-[10px] text-[#9CA3AF] text-center leading-relaxed">
            Priority P1 → discovered first · Toggle ✓ to pause · 🗑 to remove
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

