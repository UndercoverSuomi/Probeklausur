"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Bot, Save, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { ModelSelector } from "@/components/exam/model-selector";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [defaultModel, setDefaultModel] = useState("claude-sonnet-4.6");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, metadata")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name ?? "");
        const meta = profile.metadata as Record<string, unknown> | null;
        if (meta?.defaultModel) {
          setDefaultModel(meta.defaultModel as string);
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  async function handleSave() {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        metadata: { defaultModel },
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Einstellungen konnten nicht gespeichert werden.");
    } else {
      toast.success("Einstellungen gespeichert.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <>
        <Header title="Einstellungen" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </>
    );
  }

  const inputClass =
    "mt-1.5 block w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors";

  return (
    <>
      <Header title="Einstellungen" subtitle="Profil und Standardwerte" />

      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Profile section */}
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-accent" strokeWidth={1.8} />
          <h2 className="font-serif text-xl font-semibold text-ink">Profil</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">E-Mail</label>
            <input
              type="email"
              value={email}
              disabled
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-ink">
              Anzeigename
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Max Mustermann"
              className={inputClass}
            />
          </div>
        </div>

        <Separator className="my-8" />

        {/* Default model section */}
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-5 w-5 text-accent" strokeWidth={1.8} />
          <h2 className="font-serif text-xl font-semibold text-ink">
            Standard KI-Modell
          </h2>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Wird als Vorauswahl bei neuen Klausuren verwendet. Du kannst das Modell
          jederzeit pro Klausur ändern.
        </p>

        <ModelSelector selected={defaultModel} onChange={setDefaultModel} />

        <Separator className="my-8" />

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Einstellungen speichern
            </>
          )}
        </Button>
      </div>
    </>
  );
}
