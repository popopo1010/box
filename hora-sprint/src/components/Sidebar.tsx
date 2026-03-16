"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Circle,
  Network,
  Zap,
  Timer,
  Users,
  Shield,
} from "lucide-react";
import { store } from "@/lib/store";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/circles", label: "サークル・ロール", icon: Circle },
  { href: "/orgchart", label: "組織図", icon: Network },
  { href: "/tensions", label: "テンション", icon: Zap },
  { href: "/sprint", label: "スプリント", icon: Timer },
];

const mtgItems = [
  { href: "/mtg/tactical", label: "タクティカルMTG", icon: Users },
  { href: "/mtg/governance", label: "ガバナンスMTG", icon: Shield },
];

function SprintWidget() {
  const sprint = store.getActiveSprint();
  if (!sprint) {
    return (
      <div className="px-4 py-4 border-t border-border">
        <div className="text-xs text-text-muted">アクティブなスプリントなし</div>
      </div>
    );
  }
  const tasks = store.getTasksBySprint(sprint.id);
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  const end = new Date(sprint.end_date + "T23:59:59");
  const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));

  return (
    <div className="px-4 py-4 border-t border-border">
      <div className="text-xs text-text-muted mb-1">現在のスプリント</div>
      <div className="text-sm font-medium text-text mb-2 truncate">
        {sprint.name}
      </div>
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-text-muted font-mono">
        <span>{pct}%</span>
        <span>残り {days} 日</span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-[220px] bg-bg-sidebar border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
          <span className="text-white text-xs font-bold">H</span>
        </div>
        <span className="text-text font-bold text-base tracking-tight">
          Hora Sprint
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-text-muted hover:text-text hover:bg-white/5"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="my-3 mx-2 border-t border-border" />

        {mtgItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-text-muted hover:text-text hover:bg-white/5"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sprint Widget */}
      <SprintWidget />
    </aside>
  );
}
