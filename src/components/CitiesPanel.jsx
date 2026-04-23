/**
 * CitiesPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * A slide-over sheet accessible globally from the sidebar.
 * Lets you manage which Indian cities the pipeline will target:
 *   • View all configured cities with active / inactive toggle
 *   • Set priority (1 = highest — processed first)
 *   • Add any Indian city via the CityCombobox
 *   • Remove cities
 *
 * Talks to:  GET/POST/PUT/DELETE  /api/cities
 */

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { MapPin, Plus, Trash2, ChevronUp, ChevronDown, Globe, CheckCircle2, XCircle, Settings2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CityCombobox } from "@/components/CityCombobox";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

// ─── Tier badge ───────────────────────────────────────────────────────────────
const METRO = new Set([
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad",
]);
const tierLabel = (name) => {
  if (METRO.has(name)) return { label: "Metro", bg: "#567937", text: "#fff" };
  return { label: "Tier 2", bg: "#EDF0EA", text: "#3D6B56" };
};

// ─── Priority pill ────────────────────────────────────────────────────────────
function PriorityBadge({ value }) {
  const color = value === 1 ? "#793518" : value === 2 ? "#793518" : "#5C736A";
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: color + "18", color }}
    >
      P{value}
    </span>
  );
}

// ─── Single city row ──────────────────────────────────────────────────────────
function CityRow({ city, onToggle, onDelete, onPriorityUp, onPriorityDown }) {
  const tier = tierLabel(city.name);
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-[#EDF0EA] transition-colors ${
        city.is_active ? "bg-white" : "bg-[#F7F4EC] opacity-60"
      }`}
    >
      {/* Active indicator */}
      <button
        onClick={() => onToggle(city.id)}
        title={city.is_active ? "Click to deactivate" : "Click to activate"}
        className="flex-shrink-0 transition-transform hover:scale-110"
      >
        {city.is_active ? (
          <CheckCircle2 size={18} className="text-[#567937]" />
        ) : (
          <XCircle size={18} className="text-[#9CA3AF]" />
        )}
      </button>

      {/* City info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#16221E] truncate">{city.name}</span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: tier.bg + (tier.bg.length === 7 ? "22" : ""), color: tier.text === "#fff" ? tier.bg : tier.text, border: `1px solid ${tier.bg}44` }}
          >
            {tier.label}
          </span>
        </div>
        <p className="text-xs text-[#5C736A] mt-0.5 truncate">
          {[city.state, city.country].filter(Boolean).join(", ")}
          {city.last_processed_at && (
            <span className="ml-2 text-[#9CA3AF]">
              · Last run {new Date(city.last_processed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
        </p>
      </div>

      {/* Priority controls */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={() => onPriorityUp(city.id, city.priority)}
          disabled={city.priority <= 1}
          className="text-[#5C736A] hover:text-[#567937] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp size={14} />
        </button>
        <PriorityBadge value={city.priority} />
        <button
          onClick={() => onPriorityDown(city.id, city.priority)}
          className="text-[#5C736A] hover:text-[#567937] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(city.id, city.name)}
        className="flex-shrink-0 text-[#9CA3AF] hover:text-red-500 transition-colors"
        title="Remove city"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function CitiesPanel({ open, onOpenChange }) {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCity, setNewCity] = useState({ city: "", state: "", country: "India" });
  const [error, setError] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/cities`);
      setCities(res.data || []);
    } catch {
      /* silently fail — user will see empty state */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchCities();
  }, [open, fetchCities]);

  // ── Add ────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newCity.city) return;
    setAdding(true);
    setError("");
    try {
      const res = await axios.post(`${API}/cities`, {
        name: newCity.city,
        state: newCity.state || "",
        country: newCity.country || "India",
        priority: cities.length + 1,
      });
      setCities((prev) => [...prev, res.data]);
      setNewCity({ city: "", state: "", country: "India" });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add city");
    }
    setAdding(false);
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      const res = await axios.put(`${API}/cities/${id}/toggle`);
      setCities((prev) => prev.map((c) => (c.id === id ? res.data : c)));
    } catch { /* ignore */ }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from pipeline cities?`)) return;
    try {
      await axios.delete(`${API}/cities/${id}`);
      setCities((prev) => prev.filter((c) => c.id !== id));
    } catch { /* ignore */ }
  };

  // ── Priority ───────────────────────────────────────────────────────────────
  const handlePriorityUp = async (id, current) => {
    if (current <= 1) return;
    try {
      const res = await axios.put(`${API}/cities/${id}/priority`, { priority: current - 1 });
      setCities((prev) => prev.map((c) => (c.id === id ? res.data : c)));
    } catch { /* ignore */ }
  };

  const handlePriorityDown = async (id, current) => {
    try {
      const res = await axios.put(`${API}/cities/${id}/priority`, { priority: current + 1 });
      setCities((prev) => prev.map((c) => (c.id === id ? res.data : c)));
    } catch { /* ignore */ }
  };

  // ── Sort by priority then name ─────────────────────────────────────────────
  const sorted = [...cities].sort((a, b) =>
    a.priority !== b.priority ? a.priority - b.priority : a.name.localeCompare(b.name)
  );

  const activeCount = cities.filter((c) => c.is_active).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[380px] sm:w-[420px] p-0 flex flex-col bg-white border-l border-[#DCE1D9]"
        style={{ maxWidth: "420px" }}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#EDF0EA] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#567937] flex items-center justify-center">
              <Globe size={17} className="text-white" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-[#16221E]" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                Pipeline Cities
              </SheetTitle>
              <SheetDescription className="text-xs text-[#5C736A] mt-0.5">
                {activeCount} active · {cities.length} total
              </SheetDescription>
            </div>
          </div>
          <p className="text-xs text-[#5C736A] mt-2 leading-relaxed">
            Cities listed here are targeted by the lead discovery pipeline. Toggle to pause a city or reorder by priority.
          </p>
        </SheetHeader>

        {/* Add new city */}
        <div className="px-5 py-4 bg-[#F7F4EC] border-b border-[#EDF0EA] flex-shrink-0">
          <p className="text-xs font-semibold text-[#567937] uppercase tracking-widest mb-2" style={{ letterSpacing: "0.12em" }}>
            Add City
          </p>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <CityCombobox
                value={newCity.city}
                onChange={(v) => setNewCity(v)}
                placeholder="Search Indian city…"
                testId="cities-panel-combobox"
              />
              {newCity.state && (
                <p className="text-[10px] text-[#5C736A] mt-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#567937]" />
                  {newCity.state}, {newCity.country}
                </p>
              )}
            </div>
            <button
              onClick={handleAdd}
              disabled={!newCity.city || adding}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: "#793518" }}
            >
              <Plus size={15} />
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600 mt-1.5">{error}</p>
          )}
        </div>

        {/* City list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-[#5C736A]">
              Loading cities…
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
              <MapPin size={28} className="text-[#DCE1D9]" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-[#16221E]">No cities configured</p>
                <p className="text-xs text-[#5C736A] mt-1">Add your first city above to start the pipeline.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Active */}
              {sorted.filter((c) => c.is_active).length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold text-[#5C736A] bg-[#F7F4EC] border-b border-[#EDF0EA]"
                    style={{ letterSpacing: "0.12em" }}>
                    Active — processed by pipeline
                  </p>
                  {sorted.filter((c) => c.is_active).map((city) => (
                    <CityRow
                      key={city.id}
                      city={city}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onPriorityUp={handlePriorityUp}
                      onPriorityDown={handlePriorityDown}
                    />
                  ))}
                </div>
              )}

              {/* Inactive */}
              {sorted.filter((c) => !c.is_active).length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold text-[#5C736A] bg-[#F7F4EC] border-b border-[#EDF0EA]"
                    style={{ letterSpacing: "0.12em" }}>
                    Paused
                  </p>
                  {sorted.filter((c) => !c.is_active).map((city) => (
                    <CityRow
                      key={city.id}
                      city={city}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onPriorityUp={handlePriorityUp}
                      onPriorityDown={handlePriorityDown}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EDF0EA] flex-shrink-0 bg-[#F7F4EC]">
          <p className="text-[10px] text-[#9CA3AF] text-center leading-relaxed">
            Priority P1 → processed first · Toggle ✓ to pause without deleting
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
