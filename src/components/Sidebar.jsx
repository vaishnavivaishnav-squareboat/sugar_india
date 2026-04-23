import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Search, Database, Mail, TrendingUp, Users, MapPin, Layers } from "lucide-react";
import { CitiesPanel } from "./CitiesPanel";
import { SegmentsPanel } from "./SegmentsPanel";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/discover", icon: Search, label: "Lead Discovery" },
  { path: "/leads", icon: Database, label: "Lead Database" },
  { path: "/outreach", icon: Mail, label: "Outreach Center" },
];

export default function Sidebar() {
  const location = useLocation();
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [segmentsOpen, setSegmentsOpen] = useState(false);

  return (
    <aside
      data-testid="sidebar"
      style={{ backgroundColor: "#567937", minWidth: "260px", maxWidth: "260px" }}
      className="flex flex-col h-screen overflow-hidden"
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/mnemonic_logo.png"
            alt="Dhampur Green mark"
            className="w-9 h-9 object-contain flex-shrink-0"
          />
          <div className="flex flex-col">
            <img
              src="/logo.png"
              alt="Dhampur Green"
              className="h-6 object-contain object-left"
            />
            <p className="text-white/50 text-xs leading-tight mt-0.5">HORECA Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-white/30 uppercase text-xs tracking-widest px-3 mb-3" style={{ letterSpacing: '0.2em' }}>
          Navigation
        </p>
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-md text-sm ${isActive ? "active text-white font-medium" : "text-white/65 hover:text-white"}`}
            >
              <Icon size={17} strokeWidth={isActive ? 2 : 1.5} />
              {label}
            </NavLink>
          );
        })}

        {/* Pipeline settings */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-white/30 uppercase text-xs tracking-widest px-3 mb-3" style={{ letterSpacing: '0.2em' }}>Pipeline</p>
          <button
            data-testid="nav-pipeline-cities"
            onClick={() => setCitiesOpen(true)}
            className="sidebar-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white/65 hover:text-white transition-colors"
          >
            <MapPin size={17} strokeWidth={1.5} />
            Target Cities
          </button>
          <button
            data-testid="nav-pipeline-segments"
            onClick={() => setSegmentsOpen(true)}
            className="sidebar-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white/65 hover:text-white transition-colors"
          >
            <Layers size={17} strokeWidth={1.5} />
            Target Segments
          </button>
        </div>
      </nav>

      {/* Stats summary */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="bg-white/5 rounded-lg p-3 space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>Product</p>
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-[#793518]" />
            <span className="text-white/70 text-xs">Premium Sugar Supplier</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={13} className="text-[#793518]" />
            <span className="text-white/70 text-xs">B2B HORECA Sales</span>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            AM
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">Arjun Mehta</p>
            <p className="text-white/40 text-xs truncate">Regional Sales Manager</p>
          </div>
        </div>
      </div>

      {/* Cities slide-over panel */}
      <CitiesPanel open={citiesOpen} onOpenChange={setCitiesOpen} />
      {/* Segments slide-over panel */}
      <SegmentsPanel open={segmentsOpen} onOpenChange={setSegmentsOpen} />
    </aside>
  );
}
