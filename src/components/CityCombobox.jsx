/**
 * CityCombobox
 * ─────────────────────────────────────────────────────────────────────────────
 * Searchable city dropdown for India using the `country-state-city` library.
 * When a city is selected it calls onChange({ city, state, country }) so the
 * parent can auto-fill state (and optionally show country = "India").
 *
 * Uses the already-installed shadcn Popover + Command (cmdk) components so it
 * fits the existing design system without adding a separate UI library.
 */

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { City, State } from "country-state-city";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// ─── Build look-up: stateCode → stateName for India ──────────────────────────
const STATE_MAP = Object.fromEntries(
  (State.getStatesOfCountry("IN") || []).map((s) => [s.isoCode, s.name])
);

// ─── Flatten all Indian cities with resolved state names ─────────────────────
const ALL_INDIA_CITIES = (City.getCitiesOfCountry("IN") || []).map((c) => ({
  name: c.name,
  state: STATE_MAP[c.stateCode] || c.stateCode,
  country: "India",
}));

// Popular / HORECA-relevant cities shown at the top when no query is typed
const POPULAR = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Surat", "Chandigarh",
  "Nagpur", "Indore", "Bhopal", "Visakhapatnam", "Coimbatore", "Gurgaon",
  "Noida", "Faridabad", "Ghaziabad", "Vadodara", "Rajkot", "Ludhiana",
];

const POPULAR_CITIES = (() => {
  const popularSet = new Set(POPULAR.map((n) => n.toLowerCase()));
  const found = POPULAR.map((name) =>
    ALL_INDIA_CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase())
  ).filter(Boolean);
  // de-dup by name
  const seen = new Set();
  return found.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
})();

// ─── Component ───────────────────────────────────────────────────────────────
/**
 * @param {string}   value       – Currently selected city name (controlled)
 * @param {Function} onChange    – Called with { city, state, country } on selection
 * @param {string}   placeholder – Trigger button placeholder text
 * @param {string}   className   – Extra classes for the trigger button
 * @param {string}   testId      – data-testid for automation
 */
export function CityCombobox({
  value,
  onChange,
  placeholder = "Search city…",
  className = "",
  testId = "city-combobox",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Filtered city list — popular when empty, searched when typing
  const cities = useMemo(() => {
    if (!query.trim()) return POPULAR_CITIES;
    const q = query.toLowerCase();
    const startsWith = ALL_INDIA_CITIES.filter((c) =>
      c.name.toLowerCase().startsWith(q)
    );
    const contains = ALL_INDIA_CITIES.filter(
      (c) =>
        !c.name.toLowerCase().startsWith(q) &&
        c.name.toLowerCase().includes(q)
    );
    // de-dup by name (multiple cities can share a name across states)
    const seen = new Set();
    return [...startsWith, ...contains]
      .filter((c) => {
        const key = `${c.name}|${c.state}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 120);
  }, [query]);

  const handleSelect = (city) => {
    onChange({ city: city.name, state: city.state, country: city.country });
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          className={cn(
            "w-full flex items-center justify-between gap-2 border border-[#DCE1D9] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#567937] transition-colors hover:border-[#567937]/50",
            value ? "text-[#16221E]" : "text-[#9CA3AF]",
            className
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <MapPin size={13} className="flex-shrink-0 text-[#5C736A]" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <ChevronsUpDown size={14} className="flex-shrink-0 text-[#5C736A] opacity-60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[300px] p-0 border border-[#DCE1D9] shadow-lg"
        align="start"
        sideOffset={6}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type city name…"
            value={query}
            onValueChange={setQuery}
            className="border-0 focus:ring-0"
          />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm text-[#5C736A]">
              No city found. Try a different spelling.
            </CommandEmpty>
            <CommandGroup
              heading={query ? `Results for "${query}"` : "Popular Cities"}
              className="text-[10px] text-[#5C736A]"
            >
              {cities.map((city, idx) => (
                <CommandItem
                  key={`${city.name}-${city.state}-${idx}`}
                  value={city.name}
                  onSelect={() => handleSelect(city)}
                  className="flex items-center gap-2 cursor-pointer px-3 py-2 text-sm hover:bg-[#EDF0EA] aria-selected:bg-[#EDF0EA]"
                >
                  <Check
                    size={13}
                    className={cn(
                      "flex-shrink-0",
                      value === city.name
                        ? "opacity-100 text-[#567937]"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[#16221E]">{city.name}</span>
                    <span className="text-xs text-[#5C736A] ml-1.5">
                      {city.state}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
