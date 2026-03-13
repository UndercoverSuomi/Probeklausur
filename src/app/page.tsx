"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Brain,
  Target,
  BookOpen,
  Upload,
  Settings,
  GraduationCap,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Animation helpers ── */
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ── Feature data ── */
const features = [
  {
    icon: FileText,
    title: "Quellenbasierte Fragen",
    description:
      "Jede Frage wird direkt aus deinen Unterlagen generiert — mit Seitenangabe und Quellenverweisen.",
  },
  {
    icon: Target,
    title: "Adaptive Schwierigkeit",
    description:
      "Der Schwierigkeitsgrad passt sich deinem Wissensstand an. Von Grundlagen bis Transferaufgaben.",
  },
  {
    icon: BookOpen,
    title: "Zwei Lernmodi",
    description:
      "Wähle zwischen Prüfungssimulation unter Zeitdruck oder entspanntem Lernmodus mit sofortigem Feedback.",
  },
  {
    icon: Brain,
    title: "Detailliertes Review",
    description:
      "Nach jeder Klausur erhältst du eine ausführliche Analyse mit Musterlösungen und Verbesserungsvorschlägen.",
  },
];

/* ── Steps data ── */
const steps = [
  {
    number: "01",
    icon: Upload,
    title: "PDFs hochladen",
    description:
      "Lade deine Vorlesungsfolien, Skripte oder Zusammenfassungen als PDF hoch.",
  },
  {
    number: "02",
    icon: Settings,
    title: "Klausur konfigurieren",
    description:
      "Wähle Fragentypen, Schwierigkeitsgrad, Zeitlimit und Anzahl der Fragen.",
  },
  {
    number: "03",
    icon: GraduationCap,
    title: "Prüfung ablegen & lernen",
    description:
      "Bearbeite die Klausur und erhalte anschließend detailliertes Feedback zu jeder Antwort.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/60 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <GraduationCap className="h-6 w-6 text-accent" strokeWidth={1.8} />
            <span className="font-serif text-lg font-semibold tracking-tight text-ink">
              Probeklausur
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Registrieren
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex min-h-[90vh] items-center justify-center px-6 pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.p
              custom={0}
              variants={fadeInUp}
              className="mb-4 text-sm font-medium uppercase tracking-widest text-accent"
            >
              KI-gestützte Klausurvorbereitung
            </motion.p>

            <motion.h1
              custom={1}
              variants={fadeInUp}
              className="font-serif text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl md:text-6xl"
            >
              Deine Unterlagen.
              <br />
              Deine Klausur.
              <br />
              <span className="text-accent">Dein Niveau.</span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-muted"
            >
              Lade deine Vorlesungsunterlagen hoch und erhalte
              maßgeschneiderte Probeklausuren — quellenbasiert, adaptiv und
              mit detailliertem Feedback.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeInUp}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link
                href="/upload"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-7 text-base font-semibold text-white shadow-sm transition-all hover:bg-accent-hover hover:shadow-md"
              >
                <Upload className="h-4.5 w-4.5" strokeWidth={2} />
                Unterlagen hochladen
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-7 text-base font-medium text-ink transition-colors hover:bg-muted"
              >
                Mehr erfahren
                <ChevronDown className="h-4 w-4" />
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* subtle scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5 text-ink-muted/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.p
              custom={0}
              variants={fadeInUp}
              className="text-sm font-medium uppercase tracking-widest text-accent"
            >
              Funktionen
            </motion.p>
            <motion.h2
              custom={1}
              variants={fadeInUp}
              className="mt-3 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl"
            >
              Prüfungsvorbereitung, neu gedacht
            </motion.h2>
            <motion.p
              custom={2}
              variants={fadeInUp}
              className="mx-auto mt-4 max-w-2xl text-lg text-ink-muted"
            >
              Von der Quellenanalyse bis zum detaillierten Review — alles aus
              einer Hand.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeInUp}
                className={cn(
                  "group rounded-xl border border-border bg-surface p-6 transition-all",
                  "hover:border-accent/30 hover:shadow-sm"
                )}
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent-light">
                  <feature.icon
                    className="h-5 w-5 text-accent"
                    strokeWidth={1.8}
                  />
                </div>
                <h3 className="font-serif text-lg font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-border bg-muted/50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.p
              custom={0}
              variants={fadeInUp}
              className="text-sm font-medium uppercase tracking-widest text-accent"
            >
              So funktioniert es
            </motion.p>
            <motion.h2
              custom={1}
              variants={fadeInUp}
              className="mt-3 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl"
            >
              In drei Schritten zur Probeklausur
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="mt-16 grid gap-8 md:grid-cols-3"
          >
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                custom={i}
                variants={fadeInUp}
                className="relative rounded-xl border border-border bg-surface p-8 text-center"
              >
                <span className="font-serif text-5xl font-bold text-accent/15">
                  {step.number}
                </span>
                <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-light">
                  <step.icon
                    className="h-5 w-5 text-accent"
                    strokeWidth={1.8}
                  />
                </div>
                <h3 className="mt-5 font-serif text-xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {step.description}
                </p>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute -right-5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-border-strong md:block" />
                )}
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            custom={0}
            className="mt-14 text-center"
          >
            <Link
              href="/upload"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-8 text-base font-semibold text-white shadow-sm transition-all hover:bg-accent-hover hover:shadow-md"
            >
              Jetzt starten
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap
              className="h-5 w-5 text-accent"
              strokeWidth={1.8}
            />
            <span className="font-serif text-sm font-semibold text-ink">
              Probeklausur
            </span>
          </div>
          <p className="text-sm text-ink-muted">
            Für Julia ♥
          </p>
        </div>
      </footer>
    </div>
  );
}
