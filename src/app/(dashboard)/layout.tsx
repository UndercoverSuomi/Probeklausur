"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on desktop, slide-in on mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto",
          "transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header bar with hamburger */}
        <div className="flex h-14 items-center border-b border-border bg-surface px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-muted hover:text-ink"
            aria-label="Menu"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <span className="ml-3 font-serif text-base font-semibold text-ink">
            Probeklausur
          </span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-paper">
          {children}
        </main>
      </div>
    </div>
  );
}
