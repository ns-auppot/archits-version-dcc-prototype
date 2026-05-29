import { useState, useEffect } from "react";
import { NavLink } from "react-router";
import { Sun, Moon } from "lucide-react";

const navItems = [
  { label: "Overview", path: "/overview" },
  { label: "Inventory", path: "/inventory" },
  { label: "Risk", path: "/risk" },
  { label: "Protection", path: "/protection" },
];

export function TopNav() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <header className="flex items-center h-12 bg-nav-bg border-b border-border px-4 shrink-0">
      <div className="flex items-center gap-2 mr-6">
        <span className="text-text-bright tracking-tight" style={{ fontSize: "15px", fontWeight: 600 }}>
          Netskope Data Security
        </span>
      </div>

      <nav className="flex items-center gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-md transition-colors ${
                isActive
                  ? "bg-nav-active text-text-bright"
                  : "text-muted-foreground hover:text-text-bright hover:bg-nav-active/50"
              }`
            }
            style={{ fontSize: "13px", fontWeight: 500 }}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => setIsDark(!isDark)}
          className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-text-bright hover:bg-nav-active/50 transition-colors"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
