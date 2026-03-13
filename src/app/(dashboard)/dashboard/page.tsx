"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  GraduationCap,
  Clock,
  Upload,
  Plus,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

const stats = [
  {
    label: "Dokumente",
    value: "0",
    icon: FileText,
    color: "text-accent",
    bgColor: "bg-accent-light",
  },
  {
    label: "Klausuren",
    value: "0",
    icon: GraduationCap,
    color: "text-correct",
    bgColor: "bg-correct-light",
  },
  {
    label: "Letzte Aktivität",
    value: "—",
    icon: Clock,
    color: "text-partial",
    bgColor: "bg-partial-light",
  },
];

const quickActions = [
  {
    label: "Unterlagen hochladen",
    description: "PDFs, Skripte und Folien hochladen",
    href: "/upload",
    icon: Upload,
  },
  {
    label: "Neue Klausur erstellen",
    description: "Klausur aus deinen Dokumenten generieren",
    href: "/exams/new",
    icon: Plus,
  },
];

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="Willkommen zurück" />

      <div className="px-6 py-8">
        <motion.div initial="hidden" animate="visible">
          {/* Welcome */}
          <motion.div custom={0} variants={fadeInUp}>
            <h2 className="font-serif text-2xl font-bold text-ink">
              Hey Julia ♥
            </h2>
            <p className="mt-1 text-ink-muted">
              Willkommen zurück!
            </p>
          </motion.div>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i + 1}
                variants={fadeInUp}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      stat.bgColor
                    )}
                  >
                    <stat.icon
                      className={cn("h-5 w-5", stat.color)}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="font-serif text-2xl font-bold text-ink">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick actions */}
          <motion.div custom={4} variants={fadeInUp} className="mt-8">
            <h3 className="font-serif text-lg font-semibold text-ink">
              Schnellaktionen
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-all",
                    "hover:border-accent/30 hover:shadow-sm"
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-light">
                    <action.icon
                      className="h-5 w-5 text-accent"
                      strokeWidth={1.8}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {action.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Empty state */}
          <motion.div
            custom={5}
            variants={fadeInUp}
            className="mt-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-raised py-16 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FolderOpen
                className="h-7 w-7 text-ink-muted"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="mt-4 font-serif text-lg font-semibold text-ink">
              Noch keine Dokumente
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Lade deine ersten Unterlagen hoch, um mit der
              Klausurvorbereitung zu beginnen.
            </p>
            <Link
              href="/upload"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <Upload className="h-4 w-4" strokeWidth={2} />
              Erste Unterlagen hochladen
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
