# Probeklausur

**KI-gestützte, quellenbasierte Probeklausuren aus deinen Vorlesungsunterlagen.**

Probeklausur ist eine Webapp, die aus hochgeladenen PDF-Dokumenten (Vorlesungsfolien, Skripte, Reader) anspruchsvolle, adaptive Testklausuren auf Master-Niveau generiert. Jede Frage basiert strikt auf den hochgeladenen Quellen – mit Seitenangabe und Quellenverweisen.

---

## Features

- **PDF-Upload & Analyse** — Mehrere PDFs hochladen; automatische Textextraktion, Chunking, Embedding und Konzeptanalyse
- **Quellenbasierte Fragengenerierung** — Jede Frage ist durch konkrete Textstellen belegt; keine halluzinierten Inhalte
- **4 Fragetypen** — Single Choice, Multiple Select, Kurzantwort/Freitext, Numerische Rechenfragen
- **3 Schwierigkeitsstufen** — Standard (Master-Niveau), Schwer (Cross-Konzept), Sehr schwer (Synthese & Grenzfälle)
- **2 Lernmodi** — Probeprüfung (ohne Feedback bis zum Ende) und Lernmodus (sofortiges Feedback pro Frage)
- **Detailliertes Review** — Erklärungen, Musterlösungen, Quellenverweise, Schwachstellenanalyse
- **Adaptive Blueprint-Generierung** — Themenabdeckung, kognitive Niveaustufen, Schwierigkeitsverteilung

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | Next.js API Routes, Server Actions |
| Datenbank | Supabase (PostgreSQL), pgvector für Embeddings |
| Storage | Supabase Storage |
| AI | OpenAI API (GPT-4o, text-embedding-3-small) via Vercel AI SDK |
| Auth | Supabase Auth (Magic Link) |
| Deployment | Vercel |

---

## Lokale Installation

### Voraussetzungen

- Node.js 18+
- npm oder pnpm
- Supabase-Projekt (kostenlos auf [supabase.com](https://supabase.com))
- OpenAI API Key

### 1. Repository klonen

```bash
git clone <repo-url>
cd Probeklausur_claude
npm install
```

### 2. Umgebungsvariablen

```bash
cp .env.local.example .env.local
```

Fülle die Werte in `.env.local` aus:

| Variable | Beschreibung |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (öffentlich) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (nur Server) |
| `OPENAI_API_KEY` | OpenAI API Key |
| `OPENAI_MODEL` | AI-Modell für Generierung (default: `gpt-4o`) |
| `OPENAI_EMBEDDING_MODEL` | Embedding-Modell (default: `text-embedding-3-small`) |

### 3. Supabase Setup

1. Erstelle ein neues Supabase-Projekt
2. Aktiviere die **pgvector**-Extension unter Database → Extensions
3. Führe die Migration aus:

```bash
# Option A: Supabase CLI
supabase db push

# Option B: SQL Editor im Supabase Dashboard
# Kopiere den Inhalt von supabase/migrations/00001_initial_schema.sql
# und führe ihn im SQL Editor aus
```

4. Konfiguriere Auth:
   - Aktiviere "Email" als Auth Provider
   - Setze die Redirect URL auf `http://localhost:3000/callback`

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft unter [http://localhost:3000](http://localhost:3000).

---

## Architekturüberblick

```
src/
├── app/
│   ├── (auth)/           # Login, Auth Callback
│   ├── (dashboard)/      # Hauptnavigation mit Sidebar
│   │   ├── dashboard/    # Startseite
│   │   ├── upload/       # PDF-Upload
│   │   ├── documents/    # Dokumentenliste & Details
│   │   └── exams/        # Klausuren (Config, Take, Review)
│   ├── api/              # API Routes
│   │   ├── documents/    # Upload, Processing, CRUD
│   │   └── exams/        # Generation, Attempts, Grading
│   └── page.tsx          # Landing Page
├── components/
│   ├── ui/               # shadcn/ui Design System
│   ├── layout/           # Header, Sidebar
│   └── exam/             # Exam-spezifische Komponenten
├── lib/
│   ├── ai/               # AI Provider, Prompts, Schemas, Grading
│   ├── documents/        # PDF Parser, Chunker, Embedder
│   ├── retrieval/        # Vector Search, Context Builder
│   ├── scoring/          # Scoring-Logik pro Fragetyp
│   └── supabase/         # Client, Server, Middleware
└── types/                # TypeScript Typen
```

### Verarbeitungspipeline

```
PDF Upload → Text-Extraktion → Chunking → Embeddings → Konzeptanalyse
                                                            ↓
Exam Config → Blueprint-Generierung → Fragen-Generierung → Validierung → Fertige Klausur
                                                                              ↓
Klausur bearbeiten → Antworten speichern → Bewertung (objektiv + AI) → Review
```

### Fragengenerierung (AI Pipeline)

1. **Konzeptextraktion** — Hauptthemen, Formeln, Fallbeispiele aus den Dokumenten
2. **Exam Blueprint** — Verteilung nach Schwierigkeit, Fragetypen, Themenabdeckung
3. **Kontextaufbau** — Relevante Chunks per Vector Search für jede Frage
4. **Fragegenerierung** — Strukturierte JSON-Generierung pro Frage mit Source Refs
5. **Validierung** — Automatische Qualitätsprüfung (Quellendeckung, Eindeutigkeit, Schwierigkeit)

---

## Vercel Deployment

1. Verbinde das Repository mit Vercel
2. Setze die Environment Variables (siehe oben)
3. Deploy

**Wichtig für Vercel:**
- Die PDF-Verarbeitung und Exam-Generierung nutzen lange API-Routen. Bei großen PDFs kann die Vercel-Timeout-Grenze (10s im Free Plan) zum Problem werden.
- Empfehlung: Vercel Pro Plan (60s Timeout) oder Supabase Edge Functions für Hintergrundverarbeitung.
- In `next.config.ts` ist `maxDuration` für relevante API-Routen auf den maximal erlaubten Wert gesetzt.

---

## Bekannte Grenzen

- **Scan-basierte PDFs** — Nur textbasierte PDFs werden unterstützt. Bildbasierte/gescannte PDFs zeigen eine Warnung.
- **Vercel Timeouts** — Sehr große PDFs (100+ Seiten) können im Free Plan das Timeout überschreiten.
- **Freitext-Bewertung** — Die AI-gestützte Bewertung von Freitextantworten ist eine Näherung und kann in Grenzfällen ungenau sein.
- **Embedding-Kosten** — Pro Dokument werden OpenAI Embedding API-Aufrufe gemacht. Bei sehr großen Dokumenten können moderate Kosten entstehen.
- **Keine Multi-User-Collaboration** — Die App ist für einzelne Nutzer:innen konzipiert.

---

## Lizenz

Privates Projekt. Alle Rechte vorbehalten.
