"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Upload,
  GraduationCap,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Dokumente",
    href: "/documents",
    icon: FileText,
  },
  {
    label: "Hochladen",
    href: "/upload",
    icon: Upload,
  },
  {
    label: "Klausuren",
    href: "/exams",
    icon: GraduationCap,
  },
  {
    label: "Einstellungen",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-border bg-surface",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-6">
        <GraduationCap className="h-6 w-6 text-accent" strokeWidth={1.8} />
        <span className="font-serif text-lg font-semibold tracking-tight text-ink">
          Probeklausur
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent-light text-accent"
                  : "text-ink-muted hover:bg-muted hover:text-ink"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section — user + logout */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        {userEmail && (
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-light">
              <User className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            </div>
            <span className="truncate text-xs text-ink-muted">{userEmail}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-muted hover:text-ink"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
